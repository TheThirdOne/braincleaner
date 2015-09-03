var test = function(prog,input,output){
  try{
    code = "";
    stack = 0;
    prog();
  }catch(e){
    test.Error(e);
    test.Line();
    return;
  }
  for(var i = 0; i < input.length; i++){
    try{
      var out = run(code,input[i]);
      var want = output[i],got;
      if(typeof want === "string"){
        got = out[0];
      }else{
        got = out[2][out[3]];
      }
      if(got === want){
        test.Pass();
      }else{
        test.Fail(i,got,want);
      }
      test.Benchmark(i,out[1]);
    }catch(e){
      test.Error(e);
      test.Fail(i);
    }
  }
  test.Line();
};
test = (function(test){
  var testI = 0;
  var output = document.getElementById("console");
  var score = document.getElementById("tests");
  test.Error = function(e){
    output.innerHTML += "Test " + testI + ": " + e + "<br>";
  };
  test.Pass = function(){
    var node = document.createElement("div");
    node.className = "pass";
    score.appendChild(node);
  };
  test.Fail = function(i,got,wanted){
    var node = document.createElement("div");
    node.className = "fail";
    score.appendChild(node);
    if(wanted){
      output.innerHTML += "Test " + testI + "." + i + "failed. Received: " + got + " Wanted: "+ wanted+"<br>";
    }
  };
  test.Line = function(){
    score.appendChild(document.createElement("br"));
    testI++;
    benchmarks[testI] = [];
  };
  test.Benchmark = function(i,time){
    benchmarks[testI][i] = time;
  };
  return test;
})(test);
benchmarks = [[]];