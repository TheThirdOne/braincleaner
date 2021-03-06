var fcns = {};
var vars = {};
var frame = {};
var code = "";
var stack = 0;

var createMacro = function(name,stackDiff,str){
  fcns[name] = function(){
    emit(str,stackDiff);
  };
};

createMacro("dup",     1, "[->+>+<<]>>[-<<+>>]<");
createMacro("dupnot",  1, "-[+>+>+<<]>>-[<<+>>+]<");
createMacro("not",     0, "-[+>+<]>[-<+>]<");
createMacro("xor",    -1, "<[->+<]+>-[<->+[-]]<");
createMacro("xnor",   -1, "<[->+<]>-[<+>+[-]]<");
createMacro("and",    -1, "<[->+<]+>--[<->[+]]<");
createMacro("add",    -1, "[-<+>]<");
createMacro("mul",    -1, "<[->[->+>+<<]>>[-<<+>>]<<<]>[-]>[-<<+>>]<<");
createMacro("eq",     -1, "<[->-<]+>[<->[-]]<");
createMacro("neq",    -1, "<[->-<]>[<+>[-]]<");
createMacro("cmp",     0, "<[->>+<<]>>>>+<<+<+>[-<-[<]>>]>[-<<<+>>]>[-<<<[-]>>>]<<[[-]<<+>>]<"); // a b -> a=b a>=b
createMacro("nand",   -1, "<[->+<]>--[<+>[+]]<");
createMacro("or",     -1, "<[->+<]>[<+>[-]]<");
createMacro("nor",    -1, "<[->+<]+>[<->[-]]<");
createMacro("swap",    0, "<[->>+<<]>[-<+>]>[-<+>]<");
createMacro("pop",    -1, "[-]<");
createMacro("scans",   1, ">,");
createMacro("scand",   1, ">,>++++[-<------------>]<");
createMacro("printd", -1, ">++++[-<++++++++++++>]<.[-]<");

// exp = false: n -> n/c n%c
// exp = true:  n -> 0   n%c 0 n/d
fcns.divmodc = function(c,exp){
  var code = "[>[-]<",end = "";
  for(var i = 0; i < c-1;i++){
    code += "[->+<";
    end += "]";
  }
  code += "[->>>+<<[-]]" + end + ">[>]<<]>>>"+(exp?"":"[-<<<+>>>]<<");
  
  emit(code,exp?3:1);
};

fcns.printD = function(){
  var s = stack;
  fcns.divmodc(10,true);
  emit("[",0);
    fcns.divmodc(10,true);
    emit("[",0);
      fcns.divmodc(10,true);
      emit("<<",-2);
      fcns.printd();
    emit("]",0);
    emit("<<",-2);
    fcns.printd();
  emit("]",0);
  emit("<<",-2);
  fcns.printd();
  emit("<",-1);
};

fcns.prints = function(s){
  var code = ">";
  var previous = 0;
  for(var k = 0; k < s.length;k++){
    var diff = s.charCodeAt(k) - previous;
    previous += diff;
    var sign = (diff > 0)?"+":"-";
    diff = diff > 0?diff:-diff;
    for(var i = 0; i < diff; i++){
      code += sign;
    }
    code += ".";
  }
  code += "[-]<";
  emit(code,0);
};

fcns.loadc = function(c){
  var out = ">";
  for(var i = 0; i < c;i++){
    out+="+";
  }
  emit(out,1);
};

fcns.loadv = function(label,dup){
  var l="",r="",out;
  if(!vars[label]){
    throw "Unknown variable";
  }
  emit(">",1);
  var c = stack - vars[label];
  if(c <= 0){
    return;
  }
  for(var i = 0; i < c;i++){
    l += "<";
    r += ">";
  }
  out = l+"[-"+r+(dup?"+>+<":"+")+l+"]"+r+(dup?">":"");
  emit(out,dup?1:0);
};

fcns.storev = function(label,clear){
  var l="",r="",out;
  if(!vars[label]){
    throw "Unknown variable";
  }
  var c = stack - vars[label];
  if(c <= 0){
    return;
  }
  for(var i = 0; i < c;i++){
    l += "<";
    r += ">";
  }
  out = (clear?l+"[-]"+r:"")+"[-"+l+"+"+r+"]<";
  emit(out,-1);
};

fcns.load = function(label){
  fcns.loadv(label,true);
  fcns.storev(label);
};

fcns.createVar = function(label){
  emit(">",1);
  fcns.createLabel(label);
};

fcns.createLabel = function(label){
  vars[label] = stack;
};

//format stack | cond
fcns.if = function(code){
  emit("[",0);
  var tmp = stack;
  code();
  if(tmp !== stack){
    throw "Code inside if causes net stack change";
  }
  emit("-]<",-1);
};

fcns.ifelse = function(a,b){
  fcns.dup();
  emit("[",0);
  var tmp = stack;
  a();
  if(tmp !== stack){
    throw "Code inside if causes net stack change";
  }
  emit("-]<",-1);
  emit("-[",0);
  var temp = stack;
  b();
  if(temp !== stack){
    throw "Code inside if causes net stack change";
  }
  emit("+]<",-1);
};

fcns.whilenot = function(c,code){
  var neg = "", pos = "";
  for(var i = 0; i < c; i++){
    neg += "-";
    pos += "+";
  }
  emit(neg,0);
  emit("["+pos,0);
  var temp = stack;
  code();
  if(temp !== stack){
    throw "Code inside while causes net stack change:" + (stack-temp) ;
  }
  emit(neg + "]",0);
};

//format: old stack | cond | run (generated) | temp (if using not using break in this case make sure this cell is 0 before it ends)
fcns.switch = function(cases,triggers,def,breaks){
  breaks = breaks || [];
  if(triggers.length !== cases.length){
    throw "case arrays don't match length";
  }
  emit(">+<",1);
  var previous = 0;
  var code = "\n";
  for(var item = 0; item < triggers.length; item++){
    var diff = previous - triggers[item];
    var sign = diff > 0?"+":"-";
    diff = diff > 0?diff:-diff;
    for(var i = 0; i < diff; i++){
      code += sign;
    }
    code += "[";
    previous = triggers[item];
  }
  emit(code,0);
  emit(">-",0);   //set run = false
  def();
  emit("<[-]",0); //set cond = 0
  for(var i = cases.length-1; i >= 0; i--){
    emit("]>\n[-<",0); //set run = false
    cases[i]();
    emit(breaks[i]?">>+<]>[-<+>]<<":">]<",0);
  }
  emit("<\n",-2);
};

fcns.frame = function(names){
  frame._loc = 0;
  for(var i = 0; i < names.length;i++){
    frame[names[i]] = i;
  }
};
fcns.to = function(name){
  var diff = frame[name] - frame._loc;
  var sign = diff > 0 ?">":"<";
  diff = diff > 0?diff:-diff;
  var code = "";
  for(var i = 0; i < diff; i++){
    code += sign;
  }
  frame._loc = frame[name];
  emit(code,0);
};

var emit = function(str,diff){
  code += str;
  stack += diff;
  if(stack < 0){
    throw "Stack too small";
  }
};
