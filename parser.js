var parser = {},context = [[]];

parser.switch = function(){
  var c = [];
  c.type = "switch";
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

parser.parse = function(code){
  var lines = code.split("\n");
  for(var i = 0; i < lines.length;i++){
    if(lines[i] === "switch"){
      parser.switch();
      console.log("switch")
    }else if(lines[i] === "break"){
      parser.break();
      console.log("break")
    }else if(lines[i] === "end"){
      parser.end();
      console.log("end")
    }else if(lines[i].startsWith("case")){
      parser.case(parseInt(lines[i].split(" ")[1]));
      console.log("case")
    }else{
      console.log(lines[i])
      parser.inst(lines[i])
    }
  }
}