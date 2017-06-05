function reducedFn2str(fn){
  return "(defr " + fn.name + ' (' + ((fn.type === 'macroR')?'& ':'') + fn.args.join(' ') + ') (' + fn.ret.join(' ') + ')\n' + flatten(fn.insts.map(reducedExpr2Array)).map(s=>'  '+s).join('\n') + '\n)' ;
}
function reducedExpr2Array(expr){
  if(expr.type === 'while'){
    return ["(while " + expr.arg,...flatten(expr.body.map(reducedExpr2Array)).map(str=>'  '+str),")"];
  }
  if(expr.type === 'trampoline'){
    return ["(trampoline " + expr.size, ...flatten(expr.body.map(reducedExpr2Array)).map(str=>'  '+str),")"];
  }
  if(expr.type === 'if'){
    return ["(if " + expr.arg, ...flatten(expr.then.map(reducedExpr2Array)).map(str=>'  '+str),")"];
  }
  
  if(expr.type === 'call'){
    return "(call " + expr.name + ")";
  }
  if(expr.type === 'callm'){
    return "(callm " + expr.name + " " + expr.args.join(' ')+")";
  }
  
  if(expr.type === '_'){
    return "(_"+expr.name + " " + (expr.args||[]).join(' ')+")";
  }
  throw "Shouldn't be here: " + expr.type;
}

function flatten(arr){
  if(!Array.isArray(arr))return [arr];
  var out = [];
  for(let i = 0; i < arr.length; i++){
    out.push(...flatten(arr[i]));
  }
  return out;
}