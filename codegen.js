function codegenBlock(insts,stack){
  var out = [];
  for(var expr of insts){
    console.log(stack,expr);
    if(expr.type === 'while' || expr.type === 'if'){
      // The codegen for ifs and whiles is the same; ifs simply garentee to leave
      out.push(...goto(expr.arg,stack));
      out.push('[');
      out.push(...codegenBlock(expr.body||expr.then,stack));
      out.push(...goto(expr.arg,stack));
      out.push(']');
    }else if(expr.type === 'trampoline'){
      // Here be dragons
      // Pre state:
      //
      // size cells for args, final = 0, temp = 0, return = 0, size 0's < stack
      // Post state:
      // size - 1 useless cells, return value, size + 3 useless cells < stack
      
      // This trampolines up is return is 0 on body end, and down otherwise
      // The return value if returning should be in the top cell of the arguments
      // if final = 0, just drop out of the loop, else move the return value down
      
      let size  = expr.size;
      let final = stack.l - (size + 1);
      let temp  = stack.l;
      let ret   = final + 2;
      
      // shift everything up by one
      out.push(...goto(stack.l,stack));
      out.push('>[-]');
      out.push(...goto(ret-1,stack));
      out.push(repeat('<[->+<]',size));
      stack.address = stack.l - 2*size;
      
      // go to the main continuing cell
      out.push(...goto(final,stack));
      out.push('+[-');
        let body = codegenBlock(expr.body,stack);
        out.push(...body);
        out.push(...goto(temp,stack));
        out.push('+');
        out.push(...goto(ret,stack));
        out.push('[');            // if not returning
          out.push('-<<+>>');
          out.push(...goto(temp,stack));
          out.push('[-]');
          out.push(repeat('>[-]',   size-1));
          out.push(...goto(ret,stack));
          out.push('<<+>>');
        out.push(']');
        out.push(...goto(temp,stack));
        out.push('[');
          out.push('-');
          out.push(repeat('<',2*size-1));
          out.push(repeat('[-]>',size-1));
          out.push('[');
            out.push('-');
            out.push(repeat('<',size-1));
            out.push('+');
            out.push(repeat('>',size-1));
          out.push(']>');
        out.push(']');
        out.push(...goto(final,stack));
      out.push(']>[-<+>]<\n');
      stack.address = stack.l - 2*size + 1;
    }else if(expr.type === '_'){
      if(expr.name === 'pop'){
        stack.l--;
      }else if(expr.name === 'push'){
        stack.l++;
        out.push(...goto('S',stack));
        out.push('[-]');
      }else if(expr.name === 'clear'){
        out.push(...goto(expr.args[0],stack));
        out.push('[-]');
      }else if(expr.name === 'add'){
        out.push(...goto(expr.args[0],stack));
        for(let i = 0; i < expr.args[1];i++){
          out.push('+');
        }
      }else if(expr.name === 'sub'){
        out.push(...goto(expr.args[0],stack));
        for(let i = 0; i < expr.args[1];i++){
          out.push('-');
        }
      }else if(expr.name === 'move'){
        let from = stack.l+s2n(expr.args[0]);
        let dests = expr.args.slice(1).map(a=>stack.l+s2n(a));
        let moveback = false;
        let temp = expr.temp || (stack.l+1);
        dests.sort((a,b)=>a-b); // its most effecient to not overlap paths
        for(let i = 0; i < dests.length; i++){
          if(from !== dests[i]){
            out.push(...goto(dests[i],stack));
            out.push('[-]');
          }else{
            out.push(...goto(temp,stack));
            out.push('[-]');
            dests.splice(i,1,temp);
            moveback = true;
          }
        }
        out.push(...goto(expr.args[0],stack));
        out.push('[-');
        
        for(let i = 0; i < dests.length;i++){
          out.push(...goto(dests[i],stack));
          out.push('+');
        }
        out.push(...goto(expr.args[0],stack));
        out.push(']');
        if(moveback){
          out.push(...goto(temp,stack));
          out.push('[-');
          out.push(...goto(expr.args[0],stack));
          out.push('+');
          out.push(...goto(temp,stack));
          out.push(']');
        }
        out.push('\n');
      }
    }else throw "Unexpected instruction type: "+expr.type;
  }
  return out;
}

function goto(address,stack){
  if(typeof address !== 'number'){
    address = stack.l+s2n(address);
  }
  let out = [];
  let d = Math.abs(stack.address - address);
  let type = (stack.address > address)?'<':'>';
  stack.address = address;
  for(let i = 0; i < d; i++){
    out.push(type);
  }
  return out;
}

function repeat(str,times){
  var out = "";
  for(let i = 0; i < times; i++){
    out += str;
  }
  return out;
}