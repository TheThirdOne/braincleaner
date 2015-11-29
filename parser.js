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

function parseSwitch(token){
  token = token || getToken();
  if(token.token !== 'identifier' || token.data !== 'switch'){
    throw "Unexpected " + token.token + ". Expected \"switch\""
  }
  token = getToken();
  var cases = [], def = [], expression = [];
  while(token.token !== ':' && token.token !== 'EOF'){
    expression.push(token);
    token = getToken();
  }
  if(token.token !== ':'){
    throw "Unexpected " + token.token + ". Expected :";
  }
  token = getToken();
  while(token.token === 'identifier' && (token.data === 'case' || token.data === 'default')){
    var tmp; //reference to array to modify
    if (token.data === 'default'){
      tmp = def = [];
    }else{
      token = getToken();
      if(token.token !== 'number'){
        throw "Unexpected " + token.token + ". Expected a number";
      }
      tmp = [];
      cases.push({type:'case', num:token, body:tmp});
    }
    token = getToken();
    if(token.token !== ':'){
      throw "Unexpected " + token.token + ". Expected :";
    }
    token = getToken();
    while(token.data !== 'end' && token.data !== 'break' && token.data !== 'case' && token.data !== 'def' && token.token !== 'EOF'){
      tmp.push(parseStatement(token));
      token = getToken();
    }
    if(token.data === 'break'){
      tmp.push({type:'break'});

      token = getToken(); //eat the ';' and get the next token
      if(token.token !== ';'){
        throw "Unexpected " + token.token + ". Expected ;";
      }
      token = getToken();
    }
  }
  if(token.data !== 'end'){
    throw "Unexpected " + token.token + ". Expected \"break\"";
  }
  return {type:'switch', expression: expression, default: def, cases: cases};
}
