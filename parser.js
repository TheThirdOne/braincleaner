var parser = {},context = [[]];

parser.switch = function(){
  var c = [];
  c.type = "switch";
  context.push(c);
};
parser.whilenot = function(){
  var c = [];
  c.type = "whilenot";
  context.push(c);
};
parser.end= function(){
  var last = context.pop();
  context[context.length-1].push(last);
  if(last.type === "case"){
    parser.end();
  }
};
parser.case = function(c){
  if(context[context.length-1].type !== "switch" && context[context.length-1].type !== "case" ){
    throw "Cannot use case outside switch";
  }
  if(context[context.length-1].type === "case"){
    var last = context.pop();
    context[context.length-1].push(last);
  }
  var tmp = [];
  tmp.type = "case";
  tmp.case = c;
  tmp.break = false;
  context.push(tmp);
};
parser.break = function(){
  if(context[context.length-1].type !== "case" ){
    throw "Cannot use break outside case";
  }
  var last = context.pop();
  last.break = true;
  context[context.length-1].push(last);
};

parser.inst = function(inst){
  if(typeof fcns[inst] !== "function"){
    throw "Not a valid instruction";
  }
  if(fcns[inst].length !== 0){
    throw "Not a macro";
  }
  context[context.length-1].push({type:"inst",fcn:fcns[inst]});
};
parser.prints = function(line){
  context[context.length-1].push({type:"inst",fcn:fcns.prints,args:[line]});
};
parser.parse = function(code){
  var lines = code.split("\n");
  for(var i = 0; i < lines.length;i++){
    if(lines[i] === "switch"){
      parser.switch();
    }else if(lines[i] === "whilenot"){
      parser.whilenot();
    }else if(lines[i] === "break"){
      parser.break();
    }else if(lines[i] === "end"){
      parser.end();
    }else if(lines[i].startsWith("case")){
      parser.case(parseInt(lines[i].split(" ")[1]));
    }else if(lines[i].startsWith("prints")){
      parser.prints(lines[i].slice(7));
    }else{
      parser.inst(lines[i])
    }
  }
}

parser.codegen = function(context){
  console.log(context)
  if(context.type === "inst"){
    context.fcn.apply(context,context.args);
    return;
  }
  var statements = [];
  for(var i = 0; i < context.length; i++){
    statements[i] = parser.codegen.bind(parser,context[i]);
  }
  if(context.type === "switch"){
    var breaks = [], cases = [], triggers = [];
    for(var i = 0; i < context.length; i++){
      if(context[i].type === "case"){
        breaks.unshift(!context[i].break);
        triggers.unshift(context[i].case);
        cases.unshift(statements[i]);
      }
    }
    fcns.switch(cases,triggers,function(){},breaks);
    return;
  }
  var doAll = function(){
    for(var i = 0; i < statements.length; i++){
      statements[i]();
    }
  };
  console.log(statements)
  if(context.type === "whilenot"){
    console.log("starting whilenot")
    fcns.whilenot(0,doAll);
    console.log("ending whilenot");
    return;
  }
  doAll();
}