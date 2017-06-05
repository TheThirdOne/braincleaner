function inlineFn(fn,global){
  if(fn.type != 'functionR')throw "Cannot inline calls in a: " + fn.type;
  var stack = fn.args.slice();
  fn.insts = inlineBlock(fn.insts,global,stack,convertArgExclude([]));
}
function inlineMacro(fn,global){
  if(fn.type != 'macroR')throw "Cannot inline calls in a: " + fn.type;
  fn.insts = inlineBlock(fn.insts,global,[],convertArgExclude(fn.args));
}

function inlineBlock(list,global,stack,convert){
  //console.log('Entering',list,stack)
  var out = [];
  for(var expr of list){
    if(expr.type === 'while'){
      let l = stack.length;
      out.push({type:'while',arg:convert(expr.arg,stack),body:inlineBlock(expr.body,global,stack,convert)});
      if(l !== stack.length)throw "While modified stack length";
    }else if(expr.type === 'if'){
      out.push({type:'if',arg:convert(expr.arg,stack),then:inlineBlock(expr.then,global,stack,convert)});
    }else if(expr.type === 'trampoline'){
      out.push({type:'trampoline',size:expr.size,body:inlineBlock(expr.body,global,stack,convert)});
    }else if(expr.type === 'call'){
      // use identity convert to do a deep clone (and change the stack appropriately)
      out.push(...inlineBlock(global.funcs[expr.name].insts,global,stack,x=>x));
    }else if(expr.type === 'callm'){
      // Replace all partially applied substitutions with complete ones (the stack is now known enough)
      let l = stack.length;
      let m = global.macros[expr.name];
      
      let con = (a,s)=>{
        let i = m.args.indexOf(a);
        if(i === -1){ // if it is an argument of a macro, rebind and check
          let result = convert(a,s);
          return result;
        }else{
          let result = convert(expr.args[i],s);
          return result;
        }
      };
      out.push(...inlineBlock(m.insts,global,stack,con));
      if(l !== stack.length)throw "callm modified stack length";
    }else if(expr.type === '_'){
      if(expr.name === 'pop'){
        stack.pop();
      }else if(expr.name === 'push'){
        stack.push(tempName());
      }else if(expr.name === 'name'){
        stack[stack.length-1] = expr.args[0];
        continue;
      }else if(expr.name === 'bf'){
        out.push({type:'_',name:expr.name,args:expr.args.slice()});
        continue;
      }
      if(!expr.args)console.log(expr);
      out.push({type:'_',name:expr.name,args:expr.args.map(arg=>convert(arg,stack))});
    }else{
      console.error(expr);
      throw "Unexpected instruction: " + expr.type;
    }
  }
  //console.log('Exiting',list,stack);
  return out;
}

function convertArgExclude(list){
  return function(arg,stack){
    if(typeof arg !== 'string')return arg;
    if(list.indexOf(arg) !== -1)return arg;
    if(arg === 'S')return arg;
    if(arg[0] === 'S'){
      let i = parseInt(arg.slice(1));
      if(!isNaN(i)&&(i<0)){
        return arg;
      }
    }
    let k = stack.indexOf(arg);
    if(k === -1)throw "Can't find argument: " + arg;
    k -= stack.length-1;
    if(k === 0){
      return 'S';
    }
    return 'S'+k;
    };
}