//Uses getToken[x], parseInlineFunction[x], parseStatement[x]
function parseFunction(token){
  token = token || getToken();
  if(token.token !== 'identifier' && (token.data !== 'func' || token.data !== 'inline')){
    throw "Unexpected " + token.token + " \"" + token.data + "\". Expected \"func\" or \"inline\".";
  }
  if(token.data === 'inline'){
    return parseInlineFunction(token);
  }
  token = getToken();
  if(token.token !== 'identifier'){
    throw "Unexpected " + token.token + ". Expected function name.";
  }
  var name = token.data;
  token = getToken();
  var args = [];
  while(token.token != ':'){
    if(token.token != 'identifier'){
      throw "Unexpected " + token.token + ". Expected argument or :.";
    }
    args.push(token.data);
    token = getToken();
  }
  var body = [];
  token = getToken();
  while(token.data !== 'end' && token.token !== 'EOF'){
    body.push(parseStatement(token));
    token = getToken();
  }
  return {type:'function',name:name,args:args,body:body};
}

//Uses getToken[x], getInlineToken[x]
function parseInlineFunction(token){
  token = token || getToken();
  if(token.token !== 'identifier' && token.data !== 'inline'){
    throw "Unexpected " + token.token + " \"" + token.data + "\". Expected \"inline\".";
  }
  token = getToken();
  if(token.token !== 'identifier'){
    throw "Unexpected " + token.token + ". Expected function name.";
  }
  var name = token.data;
  token = getToken();
  var args = [];
  while(token.token != ':'){
    if(token.token != 'identifier'){
      throw "Unexpected " + token.token + ". Expected argument or :.";
    }
    args.push(token.data);
    token = getToken();
  }
  var body = [];
  token = getInlineToken();
  while(token.data !== 'end' && token.token !== 'EOF'){
    body.push(token);
    token = getInlineToken();
  }
  return {type:'function',name:name,args:args,body:body};
}

//Uses getToken[x], parseAssignment[x], parseIf[x], parseSwitch[], parseWhile[x]
//parse = += -= if switch while 
function parseStatement(token){
  token = token || getToken();
  if(token.token !== 'identifier'){
    throw "Unexpected " + token.token + ". Expected \"if\", \"while\", \"switch\", or a variable"
  }
  switch(token.data){
    case "if":
      return parseIf(token);
      break;
    case "while":
      return parseWhile(token);
      break;
    case "switch":
      return parseSwitch(token);
      break;
    default:
      return parseAssignment(token);
      break;
  }
}

//Uses getToken[x]
//parses statements of the form "a b c d = a b + 5 *;" or "print a"
function parseAssignment(token){
  token = token || getToken();
  if(token.token !== 'identifier'){
    throw "Unexpected " + token.token + ". Expected function or variable"
  }
  var assignment = [], operator = '', expression = [];
  while(token.token === 'identifier'){
    assignment.push(token);
    token = getToken();
  }
  if(token.token === '+=' || token.token === '=' || token.token === '-='){
    operator = token.token;
    token = getToken();
    while(token.token !== ';' && token.token !== 'EOF'){
      expression.push(token);
      token = getToken();
    }
  }
  if(token.token !== ';'){
    throw "Unexpected " + token.token + ". Expected ;";
  }
  if(operator === ''){
    operator = '_';
    expression = assignment;
    assignment = [];
  }
  return {type:'statement', assignment: assignment, operator: operator, expression: expression};
}

//Uses getToken[x]
function parseWhile(token){
  token = token || getToken();
  if(token.token !== 'identifier' || token.data !== 'while' ){
    throw "Unexpected " + token.token + ". Expected \"while\""
  }
  token = getToken();
  var body = [], expression = [];
  while(token.token !== ':' && token.token !== 'EOF'){
    expression.push(token);
    token = getToken();
  }
  if(token.token !== ':'){
    throw "Unexpected " + token.token + ". Expected :";
  }
  token = getToken();
  while(token.data !== 'end' && token.token !== 'EOF'){
    body.push(parseStatement(token));
    token = getToken();
  }
  return {type:'while', expression: expression, body: body};
}

//Uses getToken[x]
function parseIf(token){
  token = token || getToken();
  if(token.token !== 'identifier' || (token.data !== 'if' && token.data !== 'elif')){
    throw "Unexpected " + token.token + ". Expected \"if\""
  }
  token = getToken();
  var ifBody = [], elseBody = [], expression = [];
  while(token.token !== ':' && token.token !== 'EOF'){
    expression.push(token);
    token = getToken();
  }
  if(token.token !== ':'){
    throw "Unexpected " + token.token + ". Expected :";
  }
  token = getToken();
  while(token.data !== 'end' && token.data !== 'else' && token.data !== 'elif' && token.token !== 'EOF'){
    ifBody.push(parseStatement(token));
    token = getToken();
  }
  if(token.data === 'end'){
    return {type:'if', expression: expression, if: ifBody, else: []};
  }else if(token.data === 'elif'){
    return {type:'if', expression: expression, if: ifBody, else: [parseIf(token)]};
  }else if(token.data === 'else'){
    while(token.data !== 'end' && token.token !== 'EOF'){
      elseBody.push(parseStatement(token));
      token = getToken();
    }
    return {type:'if', expression: expression, if: ifBody, else: elseBody};
  }else{
    throw "Unexpected " + token.token + ". Expected \"end\", \"else\", or \"elif\",";
  }
}
