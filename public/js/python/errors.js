// Explicaciones en español, en lenguaje sencillo, de los errores más habituales.
// Son orientativas: describen lo que «suele» significar cada error.

const BY_TYPE = {
  SyntaxError: {
    title: 'Error de sintaxis',
    text: 'Python no entiende cómo está escrita una línea: falta o sobra algún símbolo (paréntesis, comillas, dos puntos…). El programa ni siquiera llega a empezar.',
  },
  IndentationError: {
    title: 'Error de sangría',
    text: 'La sangría (los espacios al principio de la línea) no es correcta. En Python la sangría indica qué líneas van «dentro» de un if, un for, una función…',
  },
  TabError: {
    title: 'Mezcla de tabuladores y espacios',
    text: 'En la sangría se mezclan tabuladores y espacios. Usa solo espacios (el editor pone 4 al pulsar Tab).',
  },
  NameError: {
    title: 'Nombre desconocido',
    text: 'Usas un nombre (de variable o función) que Python no conoce todavía.',
    tips: [
      '¿Está bien escrito? Python distingue mayúsculas y minúsculas: «Edad» y «edad» son distintos.',
      '¿Lo creaste antes de usarlo? Python lee el programa de arriba abajo.',
      'Si querías escribir un texto, ponlo entre comillas: "hola".',
    ],
  },
  TypeError: {
    title: 'Tipo de dato incorrecto',
    text: 'Una operación se ha usado con un tipo de dato que no le corresponde, por ejemplo sumar un número y un texto.',
  },
  ValueError: {
    title: 'Valor no válido',
    text: 'El tipo de dato es correcto, pero el valor concreto no sirve. Por ejemplo, int("hola"): es un texto, pero no representa un número.',
  },
  ZeroDivisionError: {
    title: 'División entre cero',
    text: 'Has dividido (o calculado el resto) entre 0, y eso no tiene resultado. Comprueba el divisor antes de dividir.',
  },
  IndexError: {
    title: 'Posición fuera de rango',
    text: 'Intentas acceder a una posición que no existe. Recuerda: las posiciones empiezan en 0 y la última es len(lista) - 1.',
  },
  KeyError: {
    title: 'Clave inexistente',
    text: 'Buscas en un diccionario una clave que no está guardada en él.',
  },
  AttributeError: {
    title: 'Atributo o método inexistente',
    text: 'Usas un método o atributo (lo que va detrás del punto) que ese tipo de dato no tiene. Por ejemplo, los números no tienen .upper().',
  },
  ModuleNotFoundError: {
    title: 'Módulo no encontrado',
    text: 'No existe el módulo que intentas importar en este entorno. Aquí solo está la biblioteca estándar de Python (no se instalan paquetes externos).',
  },
  ImportError: {
    title: 'Error al importar',
    text: 'No se pudo importar lo que pedías del módulo. Revisa el nombre.',
  },
  UnboundLocalError: {
    title: 'Variable local sin valor',
    text: 'Dentro de una función usas una variable antes de darle valor en esa función.',
  },
  RecursionError: {
    title: 'Demasiadas llamadas encadenadas',
    text: 'Una función se llama a sí misma demasiadas veces (posiblemente sin fin). Revisa el caso que debería detenerla.',
  },
  EOFError: {
    title: 'No hay más datos de entrada',
    text: 'El programa pidió un dato con input(), pero ya no quedaban datos que leer.',
  },
  KeyboardInterrupt: {
    title: 'Ejecución detenida',
    text: 'El programa se detuvo antes de terminar (por el botón «Detener» o porque tardaba demasiado).',
  },
  FileNotFoundError: {
    title: 'Archivo no encontrado',
    text: 'El archivo que intentas abrir no existe. Aquí Python usa un sistema de archivos virtual y vacío: no puede ver los archivos de tu ordenador.',
  },
  OverflowError: {
    title: 'Número demasiado grande',
    text: 'El resultado de un cálculo es demasiado grande para representarlo.',
  },
  AssertionError: {
    title: 'Comprobación fallida',
    text: 'Una instrucción assert ha encontrado que su condición es falsa.',
  },
  RuntimeError: {
    title: 'Error durante la ejecución',
    text: 'Algo falló mientras el programa se ejecutaba.',
  },
};

// Explicaciones más concretas según el mensaje del error.
const BY_MESSAGE = [
  [/can only concatenate str \(not "(\w+)"\) to str/, (m) =>
    `Intentas usar + entre un texto y un ${tipo(m[1])}. Si querías SUMAR números, el texto probablemente viene de input(), que siempre devuelve texto: conviértelo con int() o float(), por ejemplo edad = int(input("Edad: ")). Si querías UNIR textos, convierte el número con str() o usa comas en print: print("Tengo", edad).`],
  [/unsupported operand type\(s\) for ([^:]+): '(\w+)' and '(\w+)'/, (m) =>
    `El operador ${m[1].trim()} no funciona entre un ${tipo(m[2])} y un ${tipo(m[3])}.` +
    (m[2] === 'str' || m[3] === 'str' ? ' Ojo: input() siempre devuelve texto; si necesitas un número, conviértelo con int() o float().' : '')],
  [/'(<|>|<=|>=)' not supported between instances of '(\w+)' and '(\w+)'/, (m) =>
    `No se puede comparar con ${m[1]} un ${tipo(m[2])} y un ${tipo(m[3])}. Si uno de ellos viene de input(), conviértelo a número con int() o float().`],
  [/invalid literal for int\(\) with base 10: (.*)/, (m) =>
    `int() no puede convertir ${m[1]} en un número entero. Asegúrate de escribir solo cifras (sin letras, espacios ni decimales; para decimales usa float()).`],
  [/could not convert string to float: (.*)/, (m) =>
    `float() no puede convertir ${m[1]} en un número decimal. Recuerda que en Python los decimales se escriben con punto: 3.5, no 3,5.`],
  [/name '(\w+)' is not defined/, (m) =>
    `Python no conoce el nombre «${m[1]}». Comprueba que está bien escrito y que le diste un valor antes de usarlo.` +
    (/^[A-Z]/.test(m[1]) ? ' (Empieza por mayúscula: ¿querías escribirlo en minúscula?)' : '')],
  [/(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/, (m) =>
    `La función ${m[1]}() espera ${m[2]} dato(s) entre paréntesis, pero le has pasado ${m[3]}.`],
  [/(\w+)\(\) missing (\d+) required positional arguments?: (.*)/, (m) =>
    `A la función ${m[1]}() le falta(n) ${m[2]} dato(s) al llamarla: ${m[3]}.`],
  [/'(\w+)' object is not callable/, (m) =>
    `Usas paréntesis () detrás de algo que es un ${tipo(m[1])} y no una función. ¿Has usado como variable el nombre de una función (por ejemplo, input = 5 o print = ...)?`],
  [/'(\w+)' object is not subscriptable/, (m) =>
    `Usas corchetes [ ] con un ${tipo(m[1])}, pero ese tipo no tiene posiciones.`],
  [/'(\w+)' object has no attribute '(\w+)'/, (m) =>
    `Un ${tipo(m[1])} no tiene el método o atributo «${m[2]}». Revisa el nombre o el tipo de dato.`],
  [/'(\w+)' object cannot be interpreted as an integer/, (m) =>
    `Aquí se necesita un número entero, pero hay un ${tipo(m[1])}. Por ejemplo, range() necesita enteros: usa int().`],
  [/list index out of range/, () =>
    'Pides una posición de la lista que no existe. Si la lista tiene 3 elementos, las posiciones válidas son 0, 1 y 2.'],
  [/string index out of range/, () =>
    'Pides una posición del texto que no existe. Las posiciones empiezan en 0 y la última es len(texto) - 1.'],
  [/division by zero/, () => 'Estás dividiendo entre 0.'],
  [/expected ':'/, () =>
    'Falta el signo de dos puntos (:) al final de la línea. Las líneas con if, elif, else, for, while y def terminan siempre en «:».'],
  [/unterminated string literal/, () =>
    'Un texto no tiene cerradas las comillas. Si abres con " cierra con ", y si abres con \' cierra con \'.'],
  [/unterminated triple-quoted string/, () =>
    'Un texto entre comillas triples (""" … """) no está cerrado.'],
  [/'(\(|\[|\{)' was never closed/, (m) =>
    `Has abierto «${m[1]}» y no lo has cerrado. Cuenta los paréntesis/corchetes: debe haber tantos de cierre como de apertura.`],
  [/unmatched '(\)|\]|\})'/, (m) =>
    `Sobra un «${m[1]}» de cierre: no hay ninguno abierto que le corresponda.`],
  [/Missing parentheses in call to 'print'/, () =>
    'En Python 3, print necesita paréntesis: print("hola"). (print "hola" era la forma de Python 2, una versión antigua.)'],
  [/Maybe you meant '==' or ':=' instead of '='/, () =>
    'Para comparar se usa == (dos iguales). Un solo = sirve para guardar un valor en una variable.'],
  [/Perhaps you forgot a comma/, () =>
    'Parece que falta una coma entre dos elementos, por ejemplo entre los datos de print o de una lista.'],
  [/cannot assign to (literal|expression|function call)/, () =>
    'A la izquierda del = debe ir el nombre de una variable. Por ejemplo: x = 5 (no 5 = x).'],
  [/expected an indented block/, () =>
    'Después de una línea que termina en «:» (if, for, def…) la siguiente línea debe ir sangrada (con 4 espacios más).'],
  [/unexpected indent/, () =>
    'Esta línea tiene espacios al principio que no corresponden. Quítalos o alinéala con las líneas de su mismo bloque.'],
  [/unindent does not match any outer indentation level/, () =>
    'La sangría de esta línea no coincide con la de ningún bloque anterior. Alinéala exactamente con las líneas de su bloque.'],
  [/invalid character '(.)'/, (m) =>
    `Hay un carácter no válido: «${m[1]}». A veces pasa al copiar código de un PDF o de Word (comillas “curvas”, guiones largos…). Escríbelo de nuevo con el teclado.`],
  [/invalid decimal literal/, () =>
    'Hay un número pegado a letras (por ejemplo 2x o 3nombre). Los nombres de variables no pueden empezar por un número.'],
  [/El programa pidió más datos con input\(\)/, () =>
    'El programa llama a input() más veces de las que la prueba esperaba. Revisa cuántos datos pides.'],
];

function tipo(t) {
  return {
    str: 'texto (str)', int: 'número entero (int)', float: 'número decimal (float)',
    list: 'lista (list)', NoneType: 'valor None', bool: 'booleano (bool)',
    dict: 'diccionario (dict)', tuple: 'tupla (tuple)', function: 'función',
    builtin_function_or_method: 'función',
  }[t] || `dato de tipo ${t}`;
}

/** Devuelve { title, text, detail, tips } para un error de Python. */
export function explainError(err) {
  const base = BY_TYPE[err.type] || {
    title: err.type,
    text: 'Se ha producido un error al ejecutar el programa. Lee la última línea del mensaje: indica el tipo de error y una pista.',
  };
  let detail = '';
  const msg = err.message || '';
  for (const [re, fn] of BY_MESSAGE) {
    const m = msg.match(re);
    if (m) { detail = fn(m); break; }
  }
  return { title: base.title, text: base.text, detail, tips: base.tips || [] };
}
