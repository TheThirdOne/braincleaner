//tests loadc and printd
test(function(){
fcns.loadc(6);
fcns.printd();
},[""],
  ["6"]);

//tests dup, add, and dupnot
test(function(){
  fcns.loadc(2);
  fcns.loadc(3);
  fcns.dup();
  fcns.printd();
  fcns.add();
  fcns.printd();
  fcns.loadc(1);
  fcns.dupnot();
  fcns.printd();
  fcns.printd();
},[""],
  ["3501"]);

//tests whilenot, scans, and pop
test(function(){
fcns.scans();
fcns.whilenot(0,function(){
  emit(".",0);
  fcns.pop();
  fcns.scans();
});
},["a","","hello world"],
  ["a","","hello world"]);


//bf -> js compiler
test(function(){
fcns.prints("var s = [],p=0;");
fcns.scans();
fcns.whilenot(0,function(){
  fcns.switch([
  function(){fcns.prints("s[p]=(s[p]||0)+1;")},//+
  function(){fcns.prints("s[p]=(s[p]||0)-1;")},//-
  function(){fcns.prints("String.fromCharCode(s[p]||0);")},//.
  function(){fcns.prints("p--;")},//<
  function(){fcns.prints("p++;")},//>
  function(){fcns.prints("while(s[p]){")},//[
  function(){fcns.prints("}")}//]
  ],[43,45,46,60,62,91,93],function(){});
  fcns.scans();
});
},["",               ">",                  "[h-e>l+l<o] "],
  ["var s = [],p=0;","var s = [],p=0;p++;","var s = [],p=0;while(s[p]){s[p]=(s[p]||0)-1;p++;s[p]=(s[p]||0)+1;p--;}"]);