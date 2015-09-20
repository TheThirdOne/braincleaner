var run = function(code,input){
  var stack = [], tape = [], ptr = 0;
  var k = 0;
  var runtime = 0;
  var output = "";
  for(var i = 0; i < code.length && runtime < 20000; i++){
    switch(code[i]){
      case ">":
        ptr++;
        break;
      case "<":
        ptr--;
        break;
      case "+":
        tape[ptr] = ((tape[ptr] || 0)+1)%256;
        break;
      case "-":
        tape[ptr] = (tape[ptr] || 0)-1;
        if (tape[ptr] < 0) {
          tape[ptr] += 256*(Math.ceil(-tape[ptr]/256));
        }
        break;
      case ",":
        tape[ptr] = input.charCodeAt(k)||0;
        k++;
        break;
      case ".":
        output += String.fromCharCode(tape[ptr] || 0);
        break;
      case "[":
        if(tape[ptr]){
          stack.push(i);
        }else{
          var count = 1;
          i++;
          for(; i < code.length;i++){
            if(code[i] === "[")
              count++;
            else if(code[i]==="]")
              count--;
            
            if(count === 0){
              break;
            }
          }
          if(count !== 0){
            throw "Too few ]'s";
          }
        }
        break;
      case "]":
        if(stack.length === 0){
          throw "Too many ]'s";
        }
        var fallback = stack.pop();
        if(tape[ptr]){
          i = fallback;
          stack.push(fallback)
        }
        break;
    }
    runtime++;
  }
  if(runtime >= 40000){
    throw "Ran too long";
  }
  return [output,runtime,tape,ptr];
}