function optimizeFunc(fn){
  let s = fn.args.map(()=>-1);
  s.l = s.length-1;
  fn.insts = optimizeBlock(fn.insts,s);
}

function optimizeBlock(insts,stack){
  var out = [];
  for(var expr of insts){
    if(expr.type === 'while'){
      let arg = stack.l+s2n(expr.arg);
      if(stack[arg] !== 0){
        let w, cS;
        do{
          cS = stack.slice();
          cS.l = stack.l;
          w = {type:'while',arg:expr.arg,body:optimizeBlock(expr.body,cS)};
          if(cS.l !== stack.l)throw "while loop didn't return the stack";
        }while(combine(stack,cS));
        out.push(w);
        stack[arg]=0;
        console.log(stack);
      }else{
        console.log('Eliminating loop because it is sure to not execute',arg,stack);
      }
    }else if(expr.type === 'trampoline'){
      let cS = [];
      for(let i = 0; i < expr.size;i++){
        cS.push(-1);
      }
      // temp + return + second args
      for(let i = 0; i < (expr.size-2)+2;i++){
        cS.push(0);
      }
      cS.l = cS.length-1;
      let l = cS.l;
      let t = {type:'trampoline',size:expr.size,body:optimizeBlock(expr.body,cS)};
      if(cS.l !== l)throw "trampoline loop didn't restore state";
      for(let i = 0; i < 2*expr.size+3;i++){
        if(stack[stack.l+i-expr.size+1]!== cS[i] && stack[stack.l+i-expr.size+1] !== -1){
          stack[stack.l+i-expr.size+1] = -1;
        }
      }
      out.push(t);
    }else if(expr.type === 'if'){
      let arg = stack.l+s2n(expr.arg);
      if(stack[arg] > 0){
        console.log('Eliminating conditional because it is sure to execute',arg,stack);
        let l = stack.l;
        out.push(...optimizeBlock(expr.then,stack));
        if(stack[arg] !== 0)throw "If didn't garentee the condition fails on exit";
        if(l !== stack.l)throw "If didn't return the stack";
      }else if(stack[arg] !== 0){
        let cS = stack.slice();
        cS.l = stack.l;
        out.push({type:'if',arg:expr.arg,then:optimizeBlock(expr.then,cS)});
        if(cS[arg] !== 0)throw "If didn't garentee the condition fails on exit";
        if(cS.l !== stack.l)throw "If didn't return the stack";
        
        stack[arg] = 0;
        combine(stack,cS);
      }else{
        console.log('Eliminating conditional because it is sure to not execute',arg,stack,expr);
      }
    }else if(expr.type === '_'){
      optimizeBase(out,stack,expr);
    }else throw "Unexpected instruction type: "+expr.type;
  }
  return out;
}


function optimizeBase(out,stack,expr){
  if(expr.name === 'move'){
    // Makes sure are destinations are unique and not just a nop overall
    let dest = new Set(expr.args.slice(1));
    let args = [expr.args[0],...dest];
    if(args.length === 2 && args[1] === args[0])return;
    expr = {type:'_',name:'move',args:[expr.args[0],...dest]};
  }

  let last = out[out.length-1] || {};
  if(expr.name === 'pop'){
    stack.l--;
    if(last.name === 'push'){
      out.pop();
      console.log('Eliminate push pop', expr,last);
      stack[stack.l+1]=-1;
      return;
    }
    backtrack(out,stack.l+1,stack.l+1);
  }else if(expr.name === 'push'){
    stack.l++;
    if(last.name === 'pop'){
      console.log('Eliminate pop push', expr,last);
      out.pop();
      optimizeBase(out,stack,{type:'_',name:'clear',args:['S']});
      return;
    }
    if(stack.length === stack.l){
      stack.push(0);
    }else{
      stack[stack.l]=0;
    };
  }else if(expr.name === 'clear'){
    let arg = stack.l+s2n(expr.args[0]);
    if(stack[arg] === 0){
      console.log('Eliminate clear on 0', expr,stack);
      return;
    }
    stack[arg] = 0;
    backtrack(out,arg,stack.l);
  }else if(expr.name === 'move'){
    let from = stack.l+s2n(expr.args[0]);
    if(stack[from] === 0){
      console.log('Eliminate move from 0', expr,stack);
      for(let k = 1; k < expr.args.length;k++){
        optimizeBase(out,stack,{type:'_',name:'clear',args:[expr.args[k]]});
      }
      return;
    }
    if(last.name === 'move'){
      let index = last.args.indexOf(expr.args[0]);
      if(index !== -1){
        console.log('Eliminate move after move', expr,last);
        last = {type:'_',name:'move',args:last.args.slice()};
        last.args.splice(index,1,...expr.args.slice(1));
        
        from = stack.l+s2n(last.args[0]);
        if(last.name === 'move')stack[from] = -1; //reset the zero analysis as this will be its second pass
        out.pop();
        optimizeBase(out,stack,last);
        if(expr.args.slice(1).indexOf(expr.args[0]) === -1){
          optimizeBase(out,stack,{type:'_',name:'clear',args:[expr.args[0]]});
        }
        return;
      }
    }
    // Used for finding a nice temp spot if needed
    let minT = from,maxT = from;
    for(let k = 1; k < expr.args.length;k++){
      let to = stack.l+s2n(expr.args[k]);
      if(to < minT)minT=to;
      if(to > maxT)maxT=to;
      stack[to] = stack[from];
      if(to !== from)backtrack(out,to,stack.l);
    }
    if(expr.args.slice(1).indexOf(expr.args[0]) !== -1){
      expr.temp = findIdealTemp(stack,minT,maxT,from);
    }else{
      stack[from] = 0;
    }
  }else if(expr.name === 'add'){
    let arg = stack.l+s2n(expr.args[0]);
    if(stack[arg] !== -1){
      if(typeof expr.args[1] !== 'number')throw "Can't add non-number";
      stack[arg] += expr.args[1];
    }
  }else if(expr.name === 'sub'){
    let arg = stack.l+s2n(expr.args[0]);
    if(stack[arg] !== -1){
      if(typeof expr.args[1] !== 'number')throw "Can't sub non-number";
      stack[arg] -= expr.args[1];
      if(stack[arg] < 0)throw "Can't subtract past zero";
    }
  }
  out.push({type:'_',name:expr.name,temp:expr.temp,args:expr.args.slice()});
}

function s2n(s){
  if(s[0] !== 'S'){console.log(s);throw "Cannot use non-relative address"};
  if(s === 'S')return 0;
  let i = parseInt(s.slice(1));
  if(isNaN(i) || i >= 0)throw "Relative address malformed";
  return i;
}

function combine(s,cS){
  var change = false;
  for(let i = 0; i < s.length || i < cS.length;i++){
    if(s[i] !== cS[i] && s[i] !== -1){
      s[i] = -1;
      change = true;
    }
  }
  return change;
}

function findIdealTemp(stack,min,max,from){
  var cost = computeCost(stack.l+1,min,max,from);
  var minX = stack.l+1;
  for(let i = 0; i < stack.length;i++){
    if(stack[i] === 0){
      let c = computeCost(i,min,max,from);
      if(c < cost){
        minX = i;
        cost = c;
      }
    }
  }
  return minX;
}
// compute the extra cost of using cell x as a temp
// always costs + abs(x-from) for the move back
// if its outside the bounds, it costs 1 per cell outside
function computeCost(x,min,max,from){
  if(x < min){
    return min-x+from-x;
  }else if(x > max){
    return x-max+x-from;
  }else{
    return Math.abs(x-from);
  }
}

function backtrack(out,a,stack){
  for(let i = out.length-1; i > 0; i--){
    let expr = out[i], name = (a-stack!==0)?('S'+(a-stack)):'S';
    //console.log(expr,name);
    //if we reach a while or if, stop
    if(expr.type === 'while' || expr.type === 'if' || expr.type === 'trampoline')return;
    if(expr.type !== '_')throw "What instruction is this?";
    // if we reach a read, stop
    
    
    // Handle the stack maniulation
    if(expr.name === 'push'){
      stack--;
      // if a is deallocated, stop (it is completely useless)
      if(stack < a)return;
    }
    if(expr.name === 'pop')stack++;
    
    
    if(expr.name === 'clear' && expr.args[0] === name){
      console.log('Eliminate unneccessary clear (overidden)',expr);
      out.splice(i,1);
      continue;
    }
    
    // remove adds and subs that are useless
    if((expr.name === 'add' || expr.name === 'sub')&&s2n(expr.args[0]) === a-stack){
      out.splice(i,1);
      continue;
    }
    if((expr.name === 'move') && expr.args[0] === name){
      // if we reach a read, remove name from the destinations and if that is the last one delete the move
      console.log('potential eliminate' , expr);
      out[i] = {type:'_',name:'move',temp:expr.temp,args:[name,...expr.args.slice(1).filter(arg=>arg!=name)]};
      if(out[i].args.length === 1){
        out.slice(i,1);
      }
      return;
    }
    // Handle useless moves / copies
    let index = expr.args.indexOf(name);
    if(expr.name === 'move' && index !== -1){
      console.log('Eliminate unneccessary move (overidden)');
      if(expr.args.length == 2){
        out[i] = {type:'_',name:'clear',args:[expr.args[0]]};
      }else{
        out[i] = {type:'_',name:'move',temp:expr.temp,args:expr.args.filter(arg=>arg!=name)};
      }
      continue;
    }
  }
}