# Braincleaner
A simple lisp-like language that compiles down to normal brainfuck.

## Example

```
(defn != (a b)
  (let t
    (while a
      (-- a)
      (if b (-- b) (move a t))
    )
    (+= t b)
  )
)
```

## Capabilities

Let's step through the above example to get a rough idea of what the language can do.

Defn defines a function; it takes a name and a list of arguments. Return values are implied by what the last expression in the body returns. As shown in the example the arguments are copied, but can be passed by reference (think C);

```
(defn != (a b)
```

Let creates a new variable (with the value 0) which can be used within the body. It returns the value stored when the body finishes.

```
  (let t
```

While loops work exactly as you'd expect. They loop while a condition is truthy (not 0).

```
  (while a
```

This is a function call to -- (subtract 1).

```
    (-- a)
```

Ifs work like you would expect aswell; if the condition is truthy they execute the first argument otherwise they execute the second. It can return a value if both sides return a value.

```
    (if b (-- b) (move a t))
```


## Other Constructs

Probably the most important construct that is left out of the original example is `begin`; it groups expressions together into a single expression. It's commonly used to put groups of instructions in a single side of an if. It returns the value of the final expression.

```
(if (> x y)
    (begin 
      (-- x)
      (++ y)
      y
    )
    (begin 
      (-- y)
      (++ x)
       x
    )
)
```

The final feature is less of a feature and more of a bandaid over a gaping wound. Functions are executed by inlining which makes recursion impossible, but with the restricted memory model of the language, recursive is a must-have if it is to be close to turing-complete (Technically speaking its still not Turing complete if the underlying brainfuck implementation bounds the values of cells). Currently the compiler isn't smart enought to transform arbitrary recursive functions into brainfuck, but it a particular form it is.

To speak in more concrete terms, let's look at an example of the [Ackermann function](https://en.wikipedia.org/wiki/Ackermann_function)

```
(defn ack (m n)
  (if m
    (begin
      (-- m)
      (if n
        (begin
          (-- n)
          (recurse (+ m 1) n)
        )
        (tailcall m 1)
      )
    )
    (return (+ n 1))
  )
)
```

The three special functions used in this form are recurse, tailcall, and return. Return returns from the function, tailcall returns the result of the function called with the passed arguments (not strictly neccessary for language powery, but often convenient when using full recusion), and recurse returns the value of the function with the last argument replaced with the result of the function called with the passed arguments. If that was too abstract an explanation take a look at what that exmaple would look like if the special calls were replace with normal function calls. Note: the following is not legal Braincleaner (but if I could make the powerful enough compiler it would be).

```
(defn ack (m n)
  (if m
    (begin
      (-- m)
      (if n
        (begin
          (-- n)
          (ack m (ack (+ m 1) n))
        )
        (ack m 1)
      )
    )
    (+ n 1)
  )
)
```

There are a few important restrictions when using these special constructs:
  1. You cannot return normally from these functions
    a. The outermost expression must not return any value
    b. There must be a return call along some code path somewhere
  2. No code can run after one of the special constructs executes
    a. Special constructs cannot be inside whiles (even if they are garenteed to exit without executing anything more)
    b. In combination with 1a, this means that specia constructs cannot be within lets

## How it works internally

The language explained above does not directly reduce to Brainfuck; it first takes a step through an intermediate represention for a stack based machine. While this abstraction doesn't leak into the full language much (aside from the recusrive function bit), knowing about it helps you make faster programs (not as relevant as it was before I implemented optimization passes).

Additionally, it is possible to define functions in this reduced format; however this is only useful to define standard library functions or if you know the language better than the optimizer (pretty much compiler authors only).

### Example using the ackermann function

Here is the first stage of the after translation to the IR. At this stage it is still pretty readable, but clearly much lower level than Braincleaner proper. Just follow the comments for an explanation of the constructs.

```
(defr ack (m n) ($temp14) ; Defines a reduced (IR) function with two arguments m and n that returns one argument $temp14
  (_push )                ; Allocate space for another variable
  (_name $temp13-return)  ; Name that variable $temp-13-return
  (_push )
  (_name $temp13-temp)
  (trampoline 2           ; Start a trampoline with 2 arguments 
    (_push )
    (_name $temp13-continuation)
    (_add $temp13-continuation 1)
    (while $temp13-continuation     ; continue while $temp13-continuation != 0
      (_clear $temp13-continuation) ; set  $temp13-continuation = 0
      (_push )
      (callm copy m S)              ; Call a function with references (S means the top variable)
      (_push )
      (_add S 1)                    ; Add (+ in brainfuck) to a variable
      (if S-1                       ; If variable is != 0 (at the end of the if that variable MUST be 0) top variable)
        (_clear S)                  ; (S-1 means the second to the top variable)
        (callm -- m)
        (_push )
        (callm copy n S)
        (_push )
        (_add S 1)
        (if S-1
          (_clear S)
          (callm -- n)
          (_push )
          (callm copy m S)
          (_push )
          (_add S 1)
          (call +)                 ; Call a function which uses stack based arguments
          (_push )
          (callm copy n S)
          (_move S $temp13-return) ; Set the first argument to 0, and the add its value to all of the rest 
          (_add $temp13-return 1)
          (_move S-1 n)
          (_pop )                  ; Dealllocate a variable from the top of the stack
          (_pop )
          (_clear S-1)
        )
        (if S
          (_push )
          (callm copy m S)
          (_push )
          (_add S 1)
          (_move S n)
          (_move S-1 m)
          (_clear $temp13-continuation)
          (_add $temp13-continuation 1)
          (_pop )
          (_pop )
          (_clear S)
        )
        (_pop )
        (_pop )
        (_clear S-1)
      )
      (if S
        (_push )
        (callm copy n S)
        (_push )
        (_add S 1)
        (call +)
        (_move S n)
        (_clear $temp13-return)
        (_pop )
        (_clear S)
      )
      (_pop )
      (_pop )
    )
    (_pop )
  )
  (_pop )
  (_pop )
  (_pop )
)
```

After inlining all the function and doing name simplification (reducing names to stack relative references) it looks like.

```
(defr ack (m n) ($temp14)
  (_push )                  ; Note that the _name calls are gone
  (_push )
  (trampoline 2
    (_push )
    (_add S 1)
    (while S
      (_clear S)
      (_push )
      (_move S-5 S-5 S)     ; Note the S-5 occurring twice, that means we are copying S-5 to S
      (_push )
      (_add S 1)
      (if S-1
        (_clear S)
        (_sub S-6 1)
        (_push )
        (_move S-6 S-6 S)
        (_push )
        (_add S 1)
        (if S-1
          (_clear S)
          (_sub S-7 1)     ; Like _add but for - (in brainfuck)
          (_push )
          (_move S-9 S-9 S)
          (_push )
          (_add S 1)
          (while S
            (_sub S 1)
            (_add S-1 1)
          )
          (_push )
          (_move S-2 S-2 S)
          (_move S S-2)
          (_pop )
          (_pop )
          (_push )
          (_move S-9 S-9 S)
          (_move S S-8)
          (_add S-8 1)
          (_move S-1 S-9)
          (_pop )
          (_pop )
          (_clear S-1)
        )
        (if S
          (_push )
          (_move S-9 S-9 S)
          (_push )
          (_add S 1)
          (_move S S-9)
          (_move S-1 S-10)
          (_clear S-6)
          (_add S-6 1)
          (_pop )
          (_pop )
          (_clear S)
        )
        (_pop )
        (_pop )
        (_clear S-1)
      )
      (if S
        (_push )
        (_move S-6 S-6 S)
        (_push )
        (_add S 1)
        (while S
          (_sub S 1)
          (_add S-1 1)
        )
        (_push )
        (_move S-2 S-2 S)
        (_move S S-2)
        (_pop )
        (_pop )
        (_move S S-6)
        (_clear S-5)
        (_pop )
        (_clear S)
      )
      (_pop )
      (_pop )
    )
    (_pop )
  )
  (_pop )
  (_pop )
  (_pop )
)
```

After an optimization pass, it looks like

```
(defr ack (m n) ($temp14)
  (_push )
  (_push )
  (trampoline 2
    (_push )
    (_add S 1)
    (while S
      (_clear S)
      (_push )
      (_move S-5 S-5 S)
      (_push )
      (_add S 1)
      (if S-1
        (_clear S)
        (_sub S-6 1)
        (_push )
        (_move S-6 S-6 S)
        (_push )
        (_add S 1)
        (if S-1
          (_clear S)
          (_sub S-7 1)
          (_push )
          (_move S-9 S-9 S)
          (_push )
          (_add S 1)
          (while S
            (_sub S 1)
            (_add S-1 1)
          )
          (_push )
          (_pop )
          (_move S-9 S-8)
          (_add S-8 1)
          (_move S-1 S-9)
          (_pop )
          (_pop )
          (_clear S-1)
        )
        (if S
          (_push )
          (_move S-9 S)
          (_push )
          (_add S 1)
          (_move S S-9)
          (_move S-1 S-10)
          (_add S-6 1)
          (_pop )
          (_pop )
          (_clear S)
        )
        (_pop )
        (_pop )
        (_clear S-1)
      )
      (if S
        (_push )
        (_move S-6 S-6 S)
        (_push )
        (_add S 1)
        (while S
          (_sub S 1)
          (_add S-1 1)
        )
        (_push )
        (_pop )
        (_pop )
        (_move S S-6)
        (_clear S-5)
        (_pop )
        (_clear S)
      )
      (_pop )
      (_pop )
    )
    (_pop )
  )
  (_pop )
  (_pop )
  (_pop )
)
```

### Optimization passes

TODO

### Codegen

The code generation stage is pretty simple if the intermediate representation is clear, reading the source code should fill in all the neccessary details. The only interesting generation is the trampoline, but that is a beast and I am not quite prepared to explain it. 
