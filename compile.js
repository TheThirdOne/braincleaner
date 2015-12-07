function passOne(fcns, state){
  //Moves functions to map, counts max blocks, args to map
  for(var i = 0; i < fcns.length; i++){
    state.fcns[fcns[i].name] = fcns[i];
    state.fcns[fcns[i].name].ifs = countifs(fcns[i].body,0);
    fcns[i].arg = {};
    for(var k = 0; k < fcns[i].args.length;k++){
      fcns[i].arg[fcns[i].args[k]]=k;
    }
    fcns[i].calls = {};
  }
  //Checks all expressions (if, while, switch and assignment) and builds notes function calls
  for(var i = 0; i < fcns.length; i++){
    checkExprs(fcns[i].name,fcns[i].body,state);
  }
}

function countifs(block,current){
  var m = current;
  for(var i = 0; i < block.length;i++){
    if(block[i].type === 'while'){
      m = max(countifs(block[i].body,current+1),m);
    }else if(block[i].type === 'if'){
      m = max(countifs(block[i].if,current+1),m);
      m = max(countifs(block[i].else,current+1),m);
    }else if(block[i].type === 'switch'){
      for(var k = 0; k < block[i].cases;k++){
        m = max(countifs(block[i].cases[k],current+1),m);
      }
      m = max(countifs(block[i].def,current+1),m);
    }
  }
  return m;
}
function max(a,b){
  return (a>b)?a:b;
}
function checkExprs(name, block, state){
  for(var i = 0; i < block.length;i++){
    if(block[i].type === 'while'){
      checkExprs(name,block[i].body,state);
    }else if(block[i].type === 'if'){
      checkExprs(name,block[i].if,state);
      checkExprs(name,block[i].else,state);
    }else if(block[i].type === 'switch'){
      for(var k = 0; k < block[i].cases;k++){
        checkExprs(name,block[i].cases[k],state);
      }
      checkExprs(name,block[i].def,state);
    }
    if(block[i].type === 'statement'){ // make sure a main b += ... doesn't happen
      for(var k = 0; k < block[i].assignment.length; k++){
        if(block[i].assignment[k].token !== 'identifier' || state.fcns[name].arg[block[i].assignment[k].data] === undefined){
          throw "In Function " + name + ": Only variables allowed in assignment \"" + block[i].assignment.join(" ") + "\"";
        }
      }
    }
    if(block[i].type === 'statement' && !!state.fcns[block[i].expression[0].data]){ //for function calls
      var fcn = state.fcns[block[i].expression[0].data];
      state.fcns[name].calls[fcn.name] = true; //inform the parent function that this function is called
      block[i].calls = fcn.name;               //for later convience
      
      for(var k = 1; k < block[i].expression.length; k++){ //check for ... main a b + h;
        
          console.log(block[i].expression[k])
        if(block[i].expression[k].token !== 'identifier' || state.fcns[name].arg[block[i].expression[k].data] === undefined){
          throw "In Function " + name + ": Only variables allowed in function calls \"" + block[i].expression.join(" ") + "\"";
        }
      }
      if(block[i].expression.length !== fcn.args.length + 1){ // check for func main a b c: ... main a b c d
        throw "In Function " + name + ": Expected " + fcn.args.length + " arguments for function call \"" + block[i].expression.join(" ") + "\"";
      }
    }else{
      var stack = 0;
      for(var k = 0; k < block[i].expression.length; k++){ //check for ... main a b + h;
        if((block[i].expression[k].token === 'identifier' && state.fcns[name].arg[block[i].expression[k].data] !== undefined)
           || block[i].expression[k].token === 'number'){
          stack++;
        }else{
          stack--;
        }
      }
      if(stack !== 1){
        throw "In Function " + name + ": Expression must result in a stack of size 1. Resulted in stack of size " + stack + ". \"" + block[i].expression.join(" ") + "\"";
      }
    }
  }
}
