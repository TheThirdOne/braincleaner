function codegenStatement(statement,context,state){
  if(statement.type === 'statement'){
    var stack = 0, code = "";
    for(var k = 0; k < statement.expression.length; k++){
      if(statement.expression[k].token === 'identifier' && context.arg[statement.expression[k].data] !== undefined){
        code += loadv(context.arg[statement.expression[k].data],context.top+stack);
        stack++;
      }else if(statement.expression[k].token === 'number'){
        code += loadc(statement.expression[k].data,context.top+stack);
        stack++;
      }else if(state.fcns[statement.expression[k].data]){ // if function
        var fcn = state.fcns[statement.expression[k].data];
        code += move(context.top+stack-fcn.args.length);
        code += call(fcn,state);
        code += move(fcn.args.length-context.top-stack);
        stack -= fcn.args.length - fcn.return;
      }
      if(stack <= 0){
        throw "In Function " + context.name + ": Expression unbalanced stack reaches below 0.\"" + statement.expression.join(" ") + "\"";
      }
    }
    if(stack !== 1 && stack !== statement.assignment.length){
      throw "In Function " + context.name + ": Expression must result in a stack of size 1. Resulted in stack of size " + stack + ". \"" + statement.expression.join(" ") + "\"";
    }
    if(stack === 1){
      var dest = statement.assignment.map(function(e){return context.arg[e];}).sort();
      code += clear(dest);
      code += moveTo(dest,context.top+1);
    }else{
      var dest = statement.assignment.map(function(e){return context.arg[e];});
      code += clear(dest.sort());
      for(var i = 0; i < dest.length; i++){
        code += moveTo(dest[i],context.top+i+1);
      }
    }
    return code;
  }
}

function move(diff){ //
  var sign = diff > 0 ?">":"<";
  diff = diff > 0?diff:-diff;
  var code = "";
  for(var i = 0; i < diff; i++){
    code += sign;
  }
  return code;
}

function loadc(c,diff){ //load constant
  var code = move(diff);
  for(var i = 0; i < c; i++){
    code += '+';
  }
  code += move(-diff);
  return code;
}

function clear(arr){
  var last = 0, code = '';
  for(var i = 0; i < arr.length; i++){
    code += move(arr[i] - last) + '[-]';
  }
  code += move(-arr[arr.length-1]);
  return code;
}

function moveTo(arr,start){
  if(typeof arr === 'number'){
    return moveTo([arr],start);
  }
  code += move(start) + '[-', last = start;
  for(var i = 0; i < arr.length; i++){
    code += move(arr[i] - last) + '+';
  }
  code += move(start-arr[arr.length-1]) + ']';
  code += move(-start);
  return code;
}
