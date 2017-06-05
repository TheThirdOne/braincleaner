function compileTop(list,global){
  var insts = [];
  for(var expr of list){
    if(expr.type === 'function'){
      global.funcs[expr.name]  = compileDefn(expr,global);
      inlineFn(global.funcs[expr.name],global);
    }else if(expr.type === 'macro'){
      global.macros[expr.name] = compileDefn(expr,global);
      inlineMacro(global.macros[expr.name],global);
    }else if(expr.type === 'functionR'){
      global.funcs[expr.name]  = expr;
      inlineFn(global.funcs[expr.name],global);
    }else if(expr.type === 'macroR'){
      global.macros[expr.name] = expr;
      inlineMacro(global.macros[expr.name],global);
    }else{
      let stack = [];
      insts.push(...compileExpr(expr,global,stack));
      for(let i = stack.length; i > 0;i++){
        insts.push({type:'call',name:'pop',args:[]});
      }
    }
  }
  return insts;
}

function compileBlock(list,global,stack){
  var insts = [];
  var l = stack.length;
  
  for(var expr of list){
    insts.push(...clearStack(stack,l));
    insts.push(...compileExpr(expr,global,stack));
  }
  return insts;
}

function compileRecursiveBlock(list,global,stack,status){
  if(list.length === 0){
    return [];
  }
  var insts = [];
  var l = stack.length;
  
  for(let i = 0; i < list.length-1; i++){
    let expr = list[i];
    insts.push(...compileExpr(expr,global,stack));
    insts.push(...clearStack(stack,l));
  }
  insts.push(...compileRecursiveExpr(list[list.length-1],global,stack,status));
  return insts;
}

function compileDefn(fn,global){
  var out = {args:fn.args,type:fn.type+'R',name:fn.name,ret:[]};
  for(let arg of out.args){
    if(arg === 'S')throw "S is a key name for stack; it cannot be used";
    out.ret.push(arg);
  }
  var l = out.ret.length;
  out.insts = compileRecursiveBlock(fn.body,global,out.ret);
  console.log('before tramp',out)
  trampolineFunction(out,l);
  console.log('after tramp',out)
  return out;
}

function compileRecursiveExpr(expr,global,stack){
  if(expr.type === 'begin'){
    return compileRecursiveBlock(expr.body,global,stack);
  }

  if(expr.type === 'if'){
    if(expr.other.type === 'nop'){
      return compile(expr,gobal,stack);
    }
    
    let l = stack.length;
    let insts = [];
    insts.push(...compileExpr(expr.cond,global,stack));
    if(stack.length - l !== 1) throw "Conditional returned more than one number";
    
    
    insts.push({type:'_',name:'push',args:[]},{type:'_',name:'add',args:['S',1]});
    stack.push(tempName());
    // Stack is now C 1
    l = stack.length;
    console.log('before:',stack.join(', '));
    let body = [{type:'_',name:'clear',args:['S']},...compileRecursiveExpr(expr.then,global,stack)];
    console.log('after:',stack.join(', '));
    let ret = false;
    if(stack.length > l){
      ret = true;
      insts.push({type:'_',name:'push',args:[]});
      body.unshift({type:'_',name:'pop',args:[]});
      body.push(...clearStack(stack,l+1),{type:'_',name:'clear',args:['S-2']});
      stack.pop();
      
      insts.push({type:'if',arg:'S-2',then:body});
    }else{
      body.push({type:'_',name:'clear',args:['S-1']});
      insts.push({type:'if',arg:'S-1',then:body});
    }
    console.log('before2:',stack.join(', '));
    let other = compileRecursiveExpr(expr.other,global,stack);
    console.log('after2:',stack.join(', '));
    if(ret){
      if(stack.length <= l){console.error(expr,l,stack.length);throw "Then and else must match if they return or not";}
      insts.push({type:'_',name:'push',args:[]});
      other.unshift({type:'_',name:'pop',args:[]});
      other.push(...clearStack(stack,l+1),{type:'_',name:'clear',args:['S-1']});
      insts.push({type:'if',arg:'S-1',then:other},{type:'_',name:'move',args:['S','S-2']});
    }else{
      other.push({type:'_',name:'clear',args:['S']})
      insts.push({type:'if',arg:'S',then:other});
    }
    insts.push({type:'_',name:'pop',args:[]},{type:'_',name:'pop',args:[]});
    stack.pop();
    stack.pop();
    return insts;
  }
  
  if(expr.type === 'call'){
    if(expr.name === 'callt' || expr.name === 'callr'){
      let l = stack.length;
      let insts = [];
      for(let arg of expr.args){
        insts.push(...compileExpr(arg,global,stack));
      }
      if(stack.length - l !== expr.args.length){console.log(stack.length - l, expr.args.length,expr,stack); throw "This shouldn't happen"};
      insts.push({type:expr.name,args:expr.args.length});
      insts.push(...clearStack(stack,l));
      return insts;
    }else if(expr.name === 'return'){
      if(expr.args.length !== 1){console.log(expr);throw "return can only have one expression inside"};
      let l = stack.length;
      let insts = compileExpr(expr.args[0],global,stack);
      if(stack.length - l !== 1){console.log(stack.length - l, expr.args.length,expr,stack); throw "This shouldn't happen"};
      insts.push({type:'return'});
      insts.push(...clearStack(stack,l));
      return insts;
    }
  }
  return compileExpr(expr,global,stack);
}
function compileExpr(expr,global,stack){
  if(expr.type === undefined){
    if(typeof expr === 'string'){
      let i = stack.indexOf(expr);
      if(i === -1)throw "Name not found in stack: " + expr;
      stack.push(tempName());
      return [{type:'_',name:'push', args:[]},{type:'callm',name:'copy',args:[expr,'S']}];
    }else{
      stack.push(tempName());
      return [{type:'_',name:'push', args:[]},{type:'_',name:'add',args: ['S',expr]}];
    }
  }

  if(expr.type === 'begin'){
    return compileBlock(expr.body,global,stack);
  }

  if(expr.type === 'while'){
    // if the condition is simply a named value, we can use it directly as the cond
    let l = stack.length;
    if(typeof expr.cond === 'string'){
      let i = stack.indexOf(expr.cond);
      if(i === -1)throw "Name not found in stack: " + expr.cond;
      let body = compileBlock(expr.body,global,stack);
      body.push(...clearStack(stack,l));
      return [{type:'while',arg:expr.cond,body}];
      
    }
    let insts = compileExpr(expr.cond,global,stack);
    if(stack.length - l !== 1) throw "Conditional returned more than one number";

    let body = clearStack(stack,l);                     // remove the temp variable from the stack
    body.push(...compileBlock(expr.body,global,stack)); // body
    body.push(...clearStack(stack,l));                  // clean up after the body
    body.push(...compileExpr(expr.cond,global,stack));  // recompute cond

    insts.push({type:'while',arg:'S',body});
    insts.push(...clearStack(stack,l));
    
    return insts;
  }

  if(expr.type === 'if'){
    let l = stack.length;
    let insts = [];
    insts.push(...compileExpr(expr.cond,global,stack));
    if(stack.length - l !== 1) throw "Conditional returned more than one number";
    
    if(expr.other.type === 'nop'){
      // if S-1
      //   body
      insts.push({type:'if',arg:'S',then:[...compileExpr(expr.then,global,stack),...clearStack(stack,l+1),{type:'_',name:'clear',args:['S']}]});
      insts.push(...clearStack(stack,l));
      return insts;
    }
    insts.push({type:'_',name:'push',args:[]},{type:'_',name:'add',args:['S',1]});
    stack.push(tempName());
    // Stack is now C 1
    l = stack.length;
    let body = [{type:'_',name:'clear',args:['S']},...compileExpr(expr.then,global,stack)];
    let ret = false;
    if(stack.length > l){
      ret = true;
      insts.push({type:'_',name:'push',args:[]});
      body.unshift({type:'_',name:'pop',args:[]});
      body.push(...clearStack(stack,l+1),{type:'_',name:'clear',args:['S-2']});
      stack.pop();
      
      insts.push({type:'if',arg:'S-2',then:body});
    }else{
      body.push({type:'_',name:'clear',args:['S-1']});
      insts.push({type:'if',arg:'S-1',then:body});
    }
    let other = compileExpr(expr.other,global,stack);
    if(ret){
      if(stack.length <= l)throw "Then and else must match if they return or not";
      insts.push({type:'_',name:'push',args:[]});
      other.unshift({type:'_',name:'pop',args:[]});
      other.push(...clearStack(stack,l+1),{type:'_',name:'clear',args:['S-1']});
      insts.push({type:'if',arg:'S-1',then:other},{type:'_',name:'move',args:['S','S-2']},{type:'_',name:'pop',args:[]});
      stack.pop();
      
    }else{
      other.push({type:'_',name:'clear',args:['S']})
      insts.push({type:'if',arg:'S',then:other});
    }
    insts.push({type:'_',name:'pop',args:[]});
    stack.pop();
    return insts;
  }
  
  if(expr.type === 'set'){
    if(typeof expr.name !== 'string') throw "Name in set is not a name";
    let i = stack.indexOf(expr.name);
    if(i === -1)throw "Name not found in stack: " + expr.name + ", [" + stack.join(', ')+']';
    let insts = compileExpr(expr.val,global,stack);
    insts.push({type:'callm', name:'move',args:['S',expr.name]});
    stack.pop();
    return insts;
  }
  if(expr.type === 'let'){
    if(typeof expr.name !== 'string') throw "Name in let is not a string";
    if(stack.indexOf(expr.name) !== -1)throw "Name already in stack: " + expr.name + ", [" + stack.join(', ')+']';
    
    // add named value to the stack
    let insts = [{type:'_',name:'push',args:[]},{type:'_',name:'name',args:[expr.name]}];
    stack.push(expr.name);
    let l = stack.length;
    
    // compile the block and clear the stack afterwards (the return value is the named value)
    insts.push(...compileBlock(expr.body,global,stack));
    insts.push(...clearStack(stack,l));
    
    // replace name with obscured one to let it be reused
    stack.pop();
    stack.push(tempName());
    return insts;
  }
  if(expr.type === 'call'){
    if(global.macros[expr.name]){
      return [{type:'callm',name:expr.name,args:expr.args}];
    }else if(global.funcs[expr.name]){
      let l = stack.length;
      let insts = [];
      for(let arg of expr.args){
        insts.push(...compileExpr(arg,global,stack));
      }
      if(stack.length - l !== global.funcs[expr.name].args.length) throw "Wrong number of args for function";
      insts.push({type:'call',name:expr.name,args:[]});
      clearStack(stack,l);
      stack.push(...global.funcs[expr.name].ret.map(()=>tempName()));
      return insts;
    }else{
      throw "Unknown function call: " + expr.name;
    }
  }
  throw "Shouldn't be here: " + expr.type;
}

function clearStack(stack,l){
  var insts = [];
  for(;stack.length > l;){
    insts.push({type:'_',name:'pop',args:[]});
    stack.pop();
  }
  return insts;
}

var count = 0;
function tempName(){
  return "$temp" + (count++);
}

function trampolineFunction(fn,l){
  var status = {temp: tempName(),args:fn.args};
  console.log(fn);
  var {needs,block} = trampolineBlock(fn.insts,status);
  if(needs === 0){
    if(fn.ret.length-l > 0 && fn.type === 'functionR'){
      console.log('leaving one')
      fn.insts.push({type:'callm',name:'move',args:['S',fn.ret[0]]});
      fn.insts.push(...clearStack(fn.ret,1));
      console.log(fn.ret);
    }else{
      console.log('leaving none',fn.ret.length,l,fn.type);
      fn.insts.push(...clearStack(fn.ret,0));
    }
    return;
  }
  if(fn.ret.length-l !== 0)throw "Can't leave a stack with a recursive function";

  if(needs & 1 === 0) throw "Recursive, but does not return";
  var insts = [];
  if(needs & 2 !== 0){
    block.unshift({type:'_',name:'clear',args:[status.temp+'-continuation']});
    insts.push({type:'_',name:'push',args:[]},{type:'_',name:'name',args:[status.temp+'-continuation']},
               {type:'_',name:'add',args:[status.temp+'-continuation',1]},
               {type:'while',arg:status.temp+'-continuation',body:block},
               {type:'_',name:'pop',args:[]});
  }else{
    insts.push(...block);
  }
  if(needs & 4 !== 0){
    let body = insts;
    insts = push([status.temp+'-return',...fn.args.slice(2).map(a=>status.temp+a),status.temp+'-temp']);
    insts.push({type:'trampoline',size:fn.args.length,body:body});
    for(let i = 0; i < fn.args.length-2+2;i++){ // - 2 for the stack compression + 2 for the status variables
      insts.push({type:'_',name:'pop',args:[]});
    }
  }else{
    insts.push({type:'callm',name:'move',args:['S',fn.ret[0]]});
  }
  for(let i = 0; i < fn.args.length-1;i++){
    insts.push({type:'_',name:'pop',args:[]});
  }
  fn.insts = insts;
}

function push(names){
 var out = [];
 for(let i = 0; i < names.length; i++){
   out.push({type:'_',name:'push',args:[]},{type:'_',name:'name',args:[names[i]]});
 }
 return out;
}
function trampolineBlock(list,status){
  var maxNeeds = 0;
  var insts = [];
  for(var expr of list){
    if(expr.type === 'while'){
      let {needs,block} = trampolineBlock(expr.body,status);
      if(needs !== 0) throw "Wat";
      insts.push({type:'while',arg:expr.arg,body:block});
    }else if(expr.type === 'if'){
      let {needs,block} = trampolineBlock(expr.then,status);
      maxNeeds |= needs;
      insts.push({type:'if',arg:expr.arg,then:block});
    }else if(expr.type === 'callt'){
      if(expr.args !== status.args.length)throw "Wrong number of arguments";
      // Set the arguments for the next function
      for(let i = 1; i < status.args.length-1;i++){
        let name = (i === 1)?'S':('S'+(1-i));
        insts.push({type:'_',name:'move',args:[name,status.temp + status.args[status.args.length-i]]});
      }
      
      insts.push({type:'_',name:'move',args:[(status.args.length === 2)?'S':('S'-(2-status.args.length)),status.temp + '-return']},
                 {type:'_',name:'add',args:[status.temp + '-return',1]},
                 {type:'_',name:'move',args:['S'+(1-status.args.length), status.args[status.args.length-1]]});
      maxNeeds |= 4;
    }else if(expr.type === 'callr'){
      if(expr.args !== status.args.length)throw "Wrong number of arguments";
      
      // Set the arguments for the next function
      for(let i = 1; i <= status.args.length;i++){
        let name = (i === 1)?'S':('S'+(1-i));
        insts.push({type:'_',name:'move',args:[name,status.args[status.args.length-i]]});
      }
      insts.push({type:'_',name:'clear',args:[status.temp + '-continuation']},
                 {type:'_',name:'add',args:[status.temp + '-continuation',1]});
      maxNeeds |= 2;
    }else if(expr.type === 'return'){
      insts.push({type:'_',name:'move',args:['S',status.args[status.args.length-1]]},
                 {type:'_',name:'clear',args:[status.temp + '-return']});
      maxNeeds |= 1;
    }else{
      console.log(expr);
      insts.push({type:expr.type,name:expr.name,args:expr.args.slice(0)});
    }
  }
  return {needs:maxNeeds,block:insts};
}