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
  //Notes function calls, and return size
  for(var i = 0; i < fcns.length; i++){
    noteData(fcns[i].name,fcns[i].body,state);
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
function noteData(name, block, state){
  for(var i = 0; i < block.length;i++){
    if(block[i].type === 'while'){
      noteData(name,block[i].body,state);
    }else if(block[i].type === 'if'){
      noteData(name,block[i].if,state);
      noteData(name,block[i].else,state);
    }else if(block[i].type === 'switch'){
      for(var k = 0; k < block[i].cases;k++){
        noteData(name,block[i].cases[k],state);
      }
      noteData(name,block[i].def,state);
    }else if(block[i].type === 'statement'){
      for(var k = 0; k < block[i].expression.length; k++){
        if(state.fcns[block[i].expression[k].data]){
          var fcn = state.fcns[block[i].expression[k].data];
          state.fcns[name].calls[fcn.name] = true;
        }
      }
    }else if(block[i].type === 'return'){
      state.fcns[name].return = block[i].params.length;
    }
  }
}