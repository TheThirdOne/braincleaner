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

//tests createVar, loadc, storev, load, mul, printd, prints
test(function(){
fcns.createVar("x");
fcns.createVar("y");
fcns.loadc(4);
fcns.storev("x");
fcns.loadc(2);
fcns.storev("y");
fcns.load("x");
fcns.load("y");
fcns.mul();
fcns.load("x");
fcns.printd();
fcns.prints("*");
fcns.load("y");
fcns.printd();
fcns.prints("=");
fcns.printd();
},[""],
  ["4*2=8"]);

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

//tests whilenot, scans, and pop
test(function(){
fcns.scans();
fcns.printD();
},["!","d",">"],
  ["33","100","62"]);

//tests switch
test(function(){
fcns.scans();
fcns.switch([
function(){fcns.prints("+")},//+
function(){fcns.prints("-")},//-
function(){fcns.prints(".")},//.
function(){fcns.prints("<")},//<
function(){fcns.prints(">")},//>
function(){fcns.prints("{")},//[
function(){fcns.prints("}")} //]
],[43,45,46,60,62,91,93],function(){},[1,1,1,0,1,1,1]);
},[">", "]",   ".", "a"],
  ["><","}{><",".-+",""]);

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


test(function(){
context = [[]];
parser.parse("prints var s = [],p=0;\n"+
"scans\n"+
"whilenot\n"+
  "switch\n"+
    "case 93\n"+
      "prints }\n"+
      "break\n"+
    "case 91\n"+
      "prints while(s[p]){\n"+
      "break\n"+
    "case 62\n"+
      "prints p++;\n"+
      "break\n"+
    "case 60\n"+
      "prints p--;\n"+
      "break\n"+
    "case 46\n"+
      "prints String.fromCharCode(s[p]||0);\n"+
      "break\n"+
    "case 45\n"+
      "prints s[p]=(s[p]||0)-1;\n"+
      "break\n"+
    "case 43\n"+
      "prints s[p]=(s[p]||0)+1;\n"+
      "break\n"+
  "end\n"+
  "scans\n"+
"end");
parser.codegen(context);
},["",               ">",                  "[h-e>l+l<o] "],
  ["var s = [],p=0;","var s = [],p=0;p++;","var s = [],p=0;while(s[p]){s[p]=(s[p]||0)-1;p++;s[p]=(s[p]||0)+1;p--;}"]);
  
/*ackerman function
ack(m.n) = n+1 if m = 0
         = ack(m-1,1) if n = 0
         = ack(m-1,ack(m,n-1))
*/
test(function(){
context = [[]];
parser.parse(
"scand\n"+
"scand\n"+
"emit [->>>>>>+<<<<<<]<\n"+
"emit [->>>>>>+<<<<<<]>>>>>>\n"+
"frame m n r t b l\n"+
"to l\n"+
"emit ++\n"+
"whilenot\n"+
  "emit 1\n"+
  "switch\n"+
    "case 1\n"+
      "to r\n"+
      "emit [-<<<<<<+>>>>>>]\n"+ //copy to last r
      "to b\n"+
      "emit [-]<<<<<<\n"+
      "to l\n"+
      "break\n"+
    "case 2\n"+
      "to m\n"+
      "emit 1 [>>>-<<<[->>+<<]]>>[-<<+>>]>+[-<+>]<<<\n"+ // put 1 in t if m = 0
      "to r\n"+
      "if\n"+
        "+= b 1\n"+
        "+= t n\n"+
        "+= t 1\n"+
        "to l\n"+
        "emit >>-<<\n"+
        "to r\n"+
      "end\n"+
      "emit >\n"+
      "+= r t\n"+
      "to l\n"+
    "case 3\n"+
      "to n\n"+
      "emit 1 [>>-<<[->+<]]>[-<+>]>+[-<+>]<<\n"+ //put 1 in t if n = 0
      "to r\n"+
      "if\n"+
        "+= b 2\n"+
        "+= m -1\n"+
        "+= n 1\n"+
        "to l\n"+
        "emit >>-<<\n"+
        "to r\n"+
      "end\n"+
      "emit >\n"+
      "to l\n"+
    "case 4\n"+
      "+= b 5\n"+
      "to n\n"+
      "emit [->>>>>>+<<<<<<]\n"+
      "to m\n"+
      "emit [->+>>>>>+<<<<<<]\n"+
      "+= m n\n"+
      "emit >>>>>>\n"+
      "+= n -1\n"+
      "+= b 2\n"+
      "to l\n"+
      "break\n"+
    "case 5\n"+
      "+= b 2\n"+
      "+= m -1\n"+
      "+= n r\n"+
      "break\n"+
  "end\n"+
  "emit >\n"+
  "+= l b\n"+
"end\n"+
"emit <<<[-<<+>>]<<\n"+
"printd");
parser.codegen(context);
},["10","12","21","23"],
  ["2", "4", "5", "9"]);
