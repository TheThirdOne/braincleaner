function getToken(){
  var lastChar = input.getChar();
  
  while(!!lastChar.match(/\s/)){ //trim whitespace
    lastChar = input.getChar();
  }
  if(lastChar === '/'){ //comments
    lastChar = input.getChar();
    if(lastChar === '/'){
      while(lastChar != '\n' && lastChar != ''){
        lastChar = input.getChar();
      }
    }else if(lastChar === '*'){
      do{
        lastChar = input.getChar();
        while(lastChar != '*' && lastChar != ''){
          lastChar = input.getChar();
        }
      }while(lastChar != '/' && lastChar != '');
    }else{
      return {token:'/',index:input.getIndex()};
    }
    input.returnChar(lastChar);
    return getToken();
  }
  if(lastChar === ''){ //pretty obvious stuff here
    return {token:'EOF'};
  }
  if(lastChar === ':'){
    return {token:':',index:input.getIndex()};
  }
  if(lastChar === '*'){
    return {token:'*',index:input.getIndex()};
  }
  if(lastChar === '^'){
    return {token:'^',index:input.getIndex()};
  }
  if(lastChar === '|'){
    return {token:'|',index:input.getIndex()};
  }
  if(lastChar === '&'){
    return {token:'&',index:input.getIndex()};
  }
  if(lastChar === ';'){
    return {token:';',index:input.getIndex()};
  }
  if(lastChar === '='){
    lastChar = input.getChar();
    if(lastChar == '='){
      return {token:'==',index:input.getIndex()};
    }else{
      input.returnChar(lastChar);
      return {token:'=',index:input.getIndex()};
    }
  }
  if(lastChar === '+' || lastChar === '-'){
    var sign = lastChar;
    lastChar = input.getChar();
    if(lastChar == '='){
      lastChar = input.getChar();
      input.returnChar(lastChar);
      if(lastChar == '='){
        input.returnChar('=');
        return {token:sign,index:input.getIndex()};
      }else{
        return {token:sign+'=',index:input.getIndex()};
      }
    }else{
      input.returnChar(lastChar);
      return {token:sign,index:input.getIndex()};
    }
  }
  
  if(!!lastChar.match(/[A-Za-z]/)){ //identifiers
    return {token: 'identifier',
            data:   getRest(/[A-Za-z0-9]/,lastChar),
            index:  input.getIndex()};
  }
  if(!!lastChar.match(/[0-9]/)){ //numbers
    return {token: 'number',
            data:   getRest(/[0-9]/,lastChar),
            primary: true, index:input.getIndex()};
  }
  return 'Unexpected character: ' + lastChar;
}

function getInlineToken(){
  var lastChar = input.getChar();
  
  while(!!lastChar.match(/\s/)){ //trim whitespace
    lastChar = input.getChar();
  }
  if(lastChar === '/'){ //comments
    lastChar = input.getChar();
    if(lastChar === '/'){
      while(lastChar != '\n' && lastChar != ''){
        lastChar = input.getChar();
      }
    }else if(lastChar === '*'){
      do{
        lastChar = input.getChar();
        while(lastChar != '*' && lastChar != ''){
          lastChar = input.getChar();
        }
      }while(lastChar != '/' && lastChar != '');
    }else{
      throw "Unexpected / in inline function";
    }
    input.returnChar(lastChar);
    return getToken();
  }
  if(lastChar === ''){ //pretty obvious stuff here
    return {token:'EOF'};
  }
  if(!!lastChar.match(/[A-Za-z]/)){ //identifiers
    return {token: 'identifier',
            data:   getRest(/[A-Za-z0-9]/,lastChar),
            index:  input.getIndex()};
  }
  if(!!lastChar.match(/[><\+\-\.,\[\]]/)){ //inline code
    return {token: 'brainfuck',
            data:   getRest(/[><\+\-\.,\[\]]/,lastChar),
            index:input.getIndex()};
  }
  return 'Unexpected character in inline code: ' + lastChar;
}

function getRest(condition,last){ //helpful to grap a bunch of characters matching a regex
  var out = last || input.getChar();
  var lastChar = input.getChar();
  while(!!lastChar.match(condition)){
    out += lastChar;
    lastChar = input.getChar();
  }
  input.returnChar(lastChar);
  return out;
}
