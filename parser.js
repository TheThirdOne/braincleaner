function parse(str,i=0){
  var out = [];
  var tmp = undefined;
  for(;i < str.length;i++){
    if(str[i].match(/\s/)){
      if(tmp !== undefined)out.push(tmp);
      tmp = undefined;
    }else if(str[i] === '('){
      if(tmp !== undefined)out.push(tmp);
      var {tmp,i} = parse(str,i+1);
      if(i >= str.length || str[i] !== ')'){
        throw "Unexpected end of file; expected )";
      }
    }else if(str[i] === ')'){
     if(tmp !== undefined)out.push(tmp);
     return {tmp:out,i};
    }else if(str[i] === ';'){
      if(tmp !== undefined)out.push(tmp);
      tmp = undefined;
      while(i+1 < str.length && str[i+1] !== '\n')i++;
    }else{
      if(tmp === undefined){
        tmp = str[i];
      }else{
        tmp += str[i];
      }
    }
    
  }
  if(tmp !== undefined)out.push(tmp);
  return {tmp:out,i};
}

function parseTop(list){
  if(list[0] === 'define'){
    if(Array.isArray(list[1]))throw "Unexpected expression in define name";
    return {type:'define',name:list[1],body:parseExpr(list[2])};
  }
  if(list[0] === 'defn'){
    let args = list[2].map(parseArg);
    if(args[0] === '&'){
      return {type:'macro',name:parseArg(list[1]),args:args.slice(1),body:list.slice(3).map(parseExpr)};
    }else{
      return {type:'function',name:parseArg(list[1]),args,body:list.slice(3).map(parseExpr)};
    }
  }
  if(list[0] === 'defr'){
    let args = list[2].map(parseArg);
    if(args[0] === '&'){
      return {type:'macroR',name:parseArg(list[1]),args:args.slice(1),ret:[],insts:list.slice(3).map(parseRExpr)};
    }else{
      return {type:'functionR',name:parseArg(list[1]),args,ret:list[3].map(parseArg),insts:list.slice(4).map(parseRExpr)};
    }
  }
  return parseExpr(list);
}
function parseRExpr(list){
  if(!Array.isArray(list)){
    throw "Every expression in a reduced function must be a complete instruction";
  }
  if(list === []){
    return {type:'nop'};
  }

  if(Array.isArray(list[0])){
    throw "Unexpected expr in the function position";
  }
  if(list[0] === 'while'){
    return {type:'while',arg:parseArg(list[1]),body:list.slice(2).map(parseRExpr)};
  }
  if(list[0] === 'if'){
    return {type:'if',arg:parseArg(list[1]),then:list.slice(2).map(parseRExpr)};
  }
  if(list[0] === 'trampoline'){
    return {type:'trampoline',size:parseArgNum(list[1]),body:list.slice(2).map(parseRExpr)};
  }
  if(list[0] === 'call'){
    return {type:'call',name:parseArg(list[1]),args:list.slice(2).map(parseArgNum)};
  }
  if(list[0] === 'callm'){
    return {type:'callm',name:parseArg(list[1]),args:list.slice(2).map(parseArgNum)};
  }
  if(list[0][0] === '_'){
    return {type:'_',name:list[0].slice(1),args:list.slice(1).map(parseArgNum)};
  }
  throw "Name must be either while, if, call or callm, or an _method in a reduced function: " +list[0];
}
function parseArgNum(arg){
  if(Array.isArray(arg))throw "Unexpected expr; expected number or string";
  
  let val = parseInt(arg);
  if(!isNaN(val)){
    return val;
  }else{
    return arg;
  }
}
function parseExpr(list){
  if(!Array.isArray(list)){
    let val = parseInt(list);
    if(!isNaN(val)){
      return val;
    }else{
      return list;
    }
  }
  if(list === []){
    return {type:'nop'};
  }

  if(Array.isArray(list[0])){
    throw "Unexpected expr in the function position";
  }
  if(list[0] === 'begin'){
    return {type:'begin',body:list.slice(1).map(parseExpr)};
  }
  if(list[0] === 'while'){
    return {type:'while',cond:parseExpr(list[1]),body:list.slice(2).map(parseExpr)};
  }
  if(list[0] === 'if'){
    return {type:'if',cond:parseExpr(list[1]),then:parseExpr(list[2]),other:parseExpr(list[3]||[])};
  }
  if(list[0] === 'set'){
    return {type:'set',name:parseArg(list[1]),val:parseExpr(list[2])};
  }
  if(list[0] === 'let'){
    return {type:'let',name:parseArg(list[1]),body:list.slice(2).map(parseExpr)};
  }
  return {type:'call',name:parseArg(list[0]),args:list.slice(1).map(parseExpr)};
}

function parseArg(arg){
  if(!Array.isArray(arg)){
    let val = parseInt(arg);
    if(!isNaN(val)){
      console.error(val);
      throw "Unexpect numbers in variable naming";
    }else{
      return arg;
    }
  }
  throw "Unexpected expr in variable naming";
}