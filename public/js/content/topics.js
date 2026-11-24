// Ruta para principiantes: contenido COMPLEMENTARIO propio de la aplicación.
// Todo lo que hay aquí se muestra etiquetado como «Complemento», porque NO procede
// de los materiales del usuario. Los materiales importados se muestran aparte, con citas.
//
// Formato de texto: `código` y **negrita** (ver ui.rich).
// Pruebas de ejercicios:
//   { desc, stdin: ['dato1', ...], expect: ['texto que debe aparecer', ...] }
//   { desc, call: 'funcion(3)', equals: '6' }   (compara valores de Python)

const c = String.raw;

export const TOPICS = [
  // ------------------------------------------------------------------
  {
    id: 'print',
    title: 'print() y comentarios',
    short: 'Mostrar mensajes en pantalla y dejar notas en el código.',
    keywords: [
      [/print\s*\(/g, 3, 'print('], [/\bprint\b/g, 2, 'print'], [/comentario/g, 2, 'comentario'],
      [/imprimir|mostrar (por|en) pantalla|salida por pantalla/g, 2, 'mostrar en pantalla'],
      [/hola,? mundo/g, 2, 'hola mundo'], [/\bsep\s*=|\bend\s*=/g, 2, 'sep / end'],
    ],
    terms: [
      ['Programa', 'Lista de instrucciones que el ordenador ejecuta en orden, de arriba abajo.'],
      ['Función', 'Una orden con nombre que hace una tarea. Se usa escribiendo su nombre y paréntesis: `print()`.'],
      ['Cadena de texto (string)', 'Un texto escrito entre comillas, por ejemplo `"Hola"`. Las comillas indican que es texto y no una orden.'],
      ['Comentario', 'Texto que empieza por `#`. Python lo ignora: sirve para que las personas entiendan el código.'],
    ],
    steps: [
      {
        title: 'Tu primera instrucción',
        body: [
          'Un **programa** es una lista de instrucciones. Python las ejecuta una a una, de arriba abajo.',
          'La instrucción `print()` muestra en pantalla lo que pongas entre los paréntesis.',
        ],
        code: c`print("Hola, mundo")`,
        note: 'Pulsa «Probar en el editor» y luego «Ejecutar». Verás el mensaje en la consola.',
      },
      {
        title: '¿Por qué las comillas?',
        body: [
          'Las comillas indican que lo que hay dentro es **texto** (en Python se llama cadena o *string*). Puedes usar comillas dobles `"…"` o simples `\'…\'`, pero abre y cierra con las mismas.',
          'Sin comillas, Python pensaría que es el nombre de algo y daría un error `NameError`.',
        ],
        code: c`print("Me llamo Ana")
print('También vale con comillas simples')`,
      },
      {
        title: 'Varios datos en un mismo print',
        body: [
          'Puedes mostrar varios datos separándolos con comas. Python pone un espacio entre ellos.',
          'Los números se escriben sin comillas. Si escribes una operación, Python muestra el resultado.',
        ],
        code: c`print("Tengo", 20, "años")
print("2 + 3 =", 2 + 3)`,
      },
      {
        title: 'Comentarios',
        body: [
          'Todo lo que va después de `#` en una línea es un **comentario**: Python no lo ejecuta.',
          'Sirven para explicar qué hace el código, o para «desactivar» una línea mientras pruebas.',
        ],
        code: c`# Este programa saluda
print("Hola")  # esto también es un comentario
# print("Esta línea no se ejecuta")`,
        note: 'Atajo del editor: selecciona líneas y pulsa Ctrl + / para comentarlas o descomentarlas.',
      },
      {
        title: 'Cada print, una línea',
        body: [
          'Cada `print()` termina con un salto de línea. `print()` vacío deja una línea en blanco.',
          'Detalle opcional: `sep=` cambia el separador entre datos y `end=` cambia lo que se pone al final.',
        ],
        code: c`print("Uno")
print()
print("Dos", "Tres", sep=" - ")
print("Sin salto", end=" ")
print("de línea")`,
      },
    ],
    examples: [
      {
        title: 'Una tarjeta de presentación',
        code: c`# Tarjeta de presentación
print("==================")
print("Nombre:", "Lucía")
print("Curso:", "1.º")
print("==================")`,
        explain: [
          'La línea 1 es un comentario: no aparece en la salida.',
          'Cada `print` produce una línea. Los textos van entre comillas.',
          'Con la coma, `print` escribe un espacio entre "Nombre:" y "Lucía".',
        ],
      },
      {
        title: 'Operaciones dentro de print',
        code: c`print(10 + 5)
print("10 + 5")
print("Resultado:", 10 + 5)`,
        explain: [
          'Sin comillas, `10 + 5` es una operación y se muestra `15`.',
          'Con comillas, `"10 + 5"` es solo texto y se muestra tal cual.',
          'Puedes combinar ambas cosas con una coma.',
        ],
      },
    ],
    exercises: [
      {
        id: 'b-print-1', level: 1, title: 'Saluda',
        statement: 'Escribe un programa que muestre exactamente: `Hola, Python`',
        starter: '# Escribe tu código debajo\n',
        hints: [
          'Necesitas una sola instrucción: `print()`.',
          'El texto va entre comillas dentro de los paréntesis.',
        ],
        solution: c`print("Hola, Python")`,
        steps: ['Usamos `print()` para mostrar algo en pantalla.', 'Ponemos el texto entre comillas porque es una cadena de texto.'],
        tests: [{ desc: 'Muestra «Hola, Python»', expect: ['Hola, Python'] }],
      },
      {
        id: 'b-print-2', level: 1, title: 'Tres líneas',
        statement: 'Muestra tu nombre, tu ciudad y tu comida favorita, cada dato en una línea distinta. Añade un comentario al principio que explique qué hace el programa.',
        starter: '',
        hints: ['Cada `print()` escribe una línea.', 'Un comentario empieza por `#`.'],
        solution: c`# Muestra algunos datos sobre mí
print("Ana")
print("Sevilla")
print("Paella")`,
        steps: ['La primera línea es un comentario: Python la ignora.', 'Usamos tres `print()`, uno por cada línea de salida.'],
        tests: [],
        selfCheck: 'Comprueba tú: ¿salen tres líneas? ¿Hay un comentario con #?',
      },
      {
        id: 'b-print-3', level: 2, title: 'Calculadora en print',
        statement: 'Muestra en una línea `5 x 7 = 35`, pero haz que Python calcule el 35 (no lo escribas tú).',
        starter: '',
        hints: ['Puedes mezclar texto y operaciones con comas en `print`.', 'La multiplicación en Python se escribe con `*`.', 'Prueba: `print("5 x 7 =", ...)`'],
        solution: c`print("5 x 7 =", 5 * 7)`,
        steps: ['El texto `"5 x 7 ="` va entre comillas: se muestra tal cual.', '`5 * 7` va sin comillas: Python lo calcula y muestra 35.', 'La coma separa los dos datos con un espacio.'],
        tests: [{ desc: 'Muestra «5 x 7 = 35»', expect: ['5 x 7 = 35'] }],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'variables',
    title: 'Variables y tipos básicos',
    short: 'Guardar datos con un nombre y conocer los tipos int, float, str y bool.',
    keywords: [
      [/\bvariables?\b/g, 3, 'variable'], [/tipos? de datos?/g, 3, 'tipo de dato'], [/asignaci[oó]n|asignar/g, 2, 'asignación'],
      [/\bint\b|\bentero/g, 1, 'int'], [/\bfloat\b|decimal|coma flotante/g, 1, 'float'], [/\bstr\b/g, 1, 'str'],
      [/\bbool\b|booleano|\btrue\b|\bfalse\b/g, 1, 'bool'], [/type\s*\(/g, 2, 'type('], [/identificador/g, 2, 'identificador'],
    ],
    terms: [
      ['Variable', 'Un nombre que guarda un valor, como una etiqueta pegada a una caja. Se crea con `=`: `edad = 20`.'],
      ['Asignación', 'Guardar un valor en una variable con `=`. No es «igual» de matemáticas: significa «guarda esto aquí».'],
      ['Tipo de dato', 'La clase de valor: número entero (`int`), número decimal (`float`), texto (`str`) o verdadero/falso (`bool`).'],
      ['Valor', 'El dato en sí: `20`, `3.5`, `"Hola"`, `True`…'],
    ],
    steps: [
      {
        title: 'Guardar un dato',
        body: [
          'Una **variable** es un nombre que guarda un valor. Se crea escribiendo el nombre, el signo `=` y el valor.',
          'El `=` significa «guarda el valor de la derecha en el nombre de la izquierda».',
        ],
        code: c`edad = 20
print(edad)`,
      },
      {
        title: 'Las variables pueden cambiar',
        body: ['Si vuelves a asignar, el valor anterior se sustituye. Python usa siempre el último valor guardado.'],
        code: c`puntos = 10
print(puntos)
puntos = 15
print(puntos)
puntos = puntos + 5   # toma el valor actual (15) y le suma 5
print(puntos)`,
      },
      {
        title: 'Cuatro tipos básicos',
        body: [
          '`int`: números enteros (`7`, `-3`). `float`: números con decimales, **con punto** (`3.5`).',
          '`str`: texto entre comillas (`"Hola"`). `bool`: solo dos valores, `True` (verdadero) o `False` (falso).',
          'La función `type()` te dice de qué tipo es un valor.',
        ],
        code: c`print(type(7))
print(type(3.5))
print(type("Hola"))
print(type(True))`,
      },
      {
        title: '"5" no es lo mismo que 5',
        body: [
          'Con comillas es texto; sin comillas, número. Parecen iguales en pantalla, pero se comportan distinto.',
          'Puedes convertir entre tipos: `int("5")` da el número 5 y `str(5)` da el texto "5".',
        ],
        code: c`print(5 + 5)       # suma de números: 10
print("5" + "5")   # unión de textos: 55
print(int("5") + 5)`,
      },
      {
        title: 'Reglas para los nombres',
        body: [
          'Un nombre puede tener letras, números y `_`, pero **no puede empezar por número** ni tener espacios.',
          'Python distingue mayúsculas: `nota` y `Nota` son variables distintas. Lo habitual es usar minúsculas y `_`: `nota_final`.',
        ],
        code: c`nota_final = 8.5
nombre_alumno = "Pablo"
print(nombre_alumno, "tiene un", nota_final)`,
      },
    ],
    examples: [
      {
        title: 'Datos de un producto',
        code: c`producto = "Cuaderno"
precio = 2.5
unidades = 4
total = precio * unidades
print(producto, "x", unidades, "=", total, "euros")`,
        explain: [
          'Se crean tres variables con distintos tipos: `str`, `float` e `int`.',
          '`total` se calcula a partir de otras variables.',
          '`print` muestra todo junto separado por espacios.',
        ],
      },
      {
        title: 'Intercambiar valores',
        code: c`a = 1
b = 2
a, b = b, a
print("a =", a, "y b =", b)`,
        explain: ['Python permite asignar varias variables a la vez.', 'La línea 3 intercambia los valores: ahora `a` vale 2 y `b` vale 1.'],
      },
    ],
    exercises: [
      {
        id: 'b-var-1', level: 1, title: 'Tu ficha',
        statement: 'Crea una variable `nombre` con tu nombre y una variable `edad` con tu edad (número). Luego muéstralas con print, por ejemplo: `Ana 20`.',
        starter: 'nombre = \nedad = \n',
        hints: ['El nombre es texto: va entre comillas.', 'La edad es un número: sin comillas.', '`print(nombre, edad)` muestra las dos.'],
        solution: c`nombre = "Ana"
edad = 20
print(nombre, edad)`,
        steps: ['`nombre` guarda un texto (str), por eso lleva comillas.', '`edad` guarda un número entero (int), sin comillas.', 'Con `print` y comas mostramos ambas.'],
        tests: [
          { desc: 'Existe una variable nombre de tipo texto', call: 'isinstance(nombre, str)', equals: 'True' },
          { desc: 'Existe una variable edad de tipo entero', call: 'isinstance(edad, int)', equals: 'True' },
        ],
      },
      {
        id: 'b-var-2', level: 2, title: 'Tipos de datos',
        statement: 'Crea estas variables: `a = 10`, `b = 2.5`, `c = "10"`, `d = False`. Muestra el tipo de cada una con `type()`.',
        starter: '',
        hints: ['`type(a)` devuelve el tipo de a.', 'Para verlo en pantalla, mételo dentro de print: `print(type(a))`.'],
        solution: c`a = 10
b = 2.5
c = "10"
d = False
print(type(a))
print(type(b))
print(type(c))
print(type(d))`,
        steps: ['Creamos las cuatro variables.', '`type()` devuelve el tipo y `print` lo muestra: int, float, str y bool.', 'Fíjate en que `c` es str aunque contenga cifras: tiene comillas.'],
        tests: [{ desc: 'Muestra los cuatro tipos', expect: ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'bool'>"] }],
      },
      {
        id: 'b-var-3', level: 3, title: 'Precio con IVA',
        statement: 'Guarda en `precio` el valor 50 y en `iva` el valor 0.21. Calcula en `total` el precio con IVA (precio + precio × iva) y muéstralo así: `Total: 60.5`.',
        starter: '',
        hints: ['La multiplicación es `*`.', '`total = precio + precio * iva`', 'Usa `print("Total:", total)`.'],
        solution: c`precio = 50
iva = 0.21
total = precio + precio * iva
print("Total:", total)`,
        steps: ['Guardamos los datos en variables con nombres claros.', 'Python multiplica antes de sumar, como en matemáticas: 50 * 0.21 = 10.5 y luego 50 + 10.5.', 'Mostramos el texto y el resultado.'],
        tests: [
          { desc: 'total vale 60.5', call: 'total', equals: '60.5' },
          { desc: 'Muestra «Total: 60.5»', expect: ['Total: 60.5'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'input',
    title: 'Entrada de datos',
    short: 'Pedir datos a la persona usuaria con input() y convertirlos.',
    keywords: [
      [/input\s*\(/g, 3, 'input('], [/entrada de datos/g, 3, 'entrada de datos'], [/\bteclado\b/g, 2, 'teclado'],
      [/(pedir|pida|pidan|pide|solicite|solicitar|lea|leer) (al usuario |a la persona )?(un |una |el |la |los |las |tu |su |dos |tres )?(dato|numero|valor|nombre|edad|frase|palabra|nota)|introduc[ei]r? (un |el )?(dato|numero|valor)/g, 2, 'pedir datos'],
      [/(int|float)\s*\(\s*input/g, 3, 'int(input('], [/\bconversi[oó]n\b|convertir/g, 1, 'conversión'], [/raw_input/g, 3, 'raw_input'],
    ],
    terms: [
      ['Entrada', 'Datos que el programa recibe de la persona que lo usa (por ejemplo, lo que escribe con el teclado).'],
      ['input()', 'Función que espera a que escribas algo y pulses Intro. Devuelve lo escrito **siempre como texto (str)**.'],
      ['Conversión', 'Transformar un dato de un tipo a otro: `int("7")` → 7, `float("2.5")` → 2.5.'],
    ],
    steps: [
      {
        title: 'Preguntar algo',
        body: [
          '`input()` detiene el programa y espera a que escribas algo y pulses **Intro**.',
          'Lo que escribes se guarda normalmente en una variable. El texto entre paréntesis es la pregunta que se muestra.',
        ],
        code: c`nombre = input("¿Cómo te llamas? ")
print("Encantado,", nombre)`,
        note: 'Al ejecutarlo, escribe tu respuesta en la consola (abajo) y pulsa Intro.',
      },
      {
        title: 'input() siempre devuelve texto',
        body: [
          'Aunque escribas un número, `input()` lo devuelve como texto (`str`).',
          'Por eso `"3" + "4"` daría `"34"`, no 7. Para hacer cuentas hay que **convertir**.',
        ],
        code: c`dato = input("Escribe un número: ")
print(type(dato))`,
      },
      {
        title: 'Convertir a número',
        body: [
          'Usa `int()` para números enteros y `float()` para números con decimales.',
          'Es muy habitual hacerlo todo en una línea: `int(input(...))`. Python ejecuta primero lo de dentro.',
        ],
        code: c`edad = int(input("¿Cuántos años tienes? "))
print("El año que viene tendrás", edad + 1)`,
      },
      {
        title: 'Si escribes algo que no es un número',
        body: [
          'Si el programa hace `int(...)` y escribes «hola», se produce un `ValueError`: el texto no representa un entero.',
          'En los decimales usa punto: `2.5`. Con coma (`2,5`) `float()` también falla. Más adelante verás cómo controlar estos errores.',
        ],
        code: c`precio = float(input("Precio: "))
print("Con descuento:", precio * 0.9)`,
      },
    ],
    examples: [
      {
        title: 'Suma de dos números',
        code: c`a = int(input("Primer número: "))
b = int(input("Segundo número: "))
print("La suma es", a + b)`,
        explain: ['Se piden dos datos y se convierten a `int`.', 'Si no convirtieras, `a + b` uniría los textos.'],
      },
      {
        title: 'Saludo personalizado',
        code: c`nombre = input("Nombre: ")
ciudad = input("Ciudad: ")
print("Hola,", nombre + ". ¿Qué tal por", ciudad + "?")`,
        explain: ['Aquí no hace falta convertir: son textos.', 'Con `+` se unen textos sin espacio; con la coma, `print` añade un espacio.'],
      },
    ],
    exercises: [
      {
        id: 'b-in-1', level: 1, title: 'Eco',
        statement: 'Pide a la persona su color favorito y muestra: `Tu color favorito es ...` (con el color que haya escrito).',
        starter: '',
        hints: ['Guarda lo que devuelve `input()` en una variable.', '`print("Tu color favorito es", color)`'],
        solution: c`color = input("¿Cuál es tu color favorito? ")
print("Tu color favorito es", color)`,
        steps: ['`input()` muestra la pregunta y devuelve lo escrito.', 'Lo guardamos en `color` y lo mostramos con `print`.'],
        tests: [
          { desc: 'Con «azul» muestra «Tu color favorito es azul»', stdin: ['azul'], expect: ['Tu color favorito es azul'] },
          { desc: 'Con «verde» muestra «Tu color favorito es verde»', stdin: ['verde'], expect: ['Tu color favorito es verde'] },
        ],
      },
      {
        id: 'b-in-2', level: 2, title: 'El doble',
        statement: 'Pide un número entero y muestra su doble. Por ejemplo, si escribe 7: `El doble es 14`.',
        starter: '',
        hints: ['Recuerda que `input()` devuelve texto.', 'Convierte con `int(...)` antes de multiplicar.', '`n = int(input("Número: "))`'],
        solution: c`n = int(input("Escribe un número: "))
print("El doble es", n * 2)`,
        steps: ['Pedimos el dato y lo convertimos a entero con `int()`.', 'Multiplicamos por 2 dentro de `print`.'],
        tests: [
          { desc: 'Con 7 muestra 14', stdin: ['7'], expect: ['El doble es 14'] },
          { desc: 'Con -3 muestra -6', stdin: ['-3'], expect: ['El doble es -6'] },
        ],
      },
      {
        id: 'b-in-3', level: 3, title: 'Edad en meses',
        statement: 'Pide el nombre y la edad en años. Muestra un mensaje como: `Laura, has vivido unos 240 meses`.',
        starter: '',
        hints: ['Necesitas dos `input()`.', 'Solo la edad hay que convertirla a número.', 'Meses = años × 12. Para que no haya espacio antes de la coma, une el nombre y la coma con `+`.'],
        solution: c`nombre = input("Nombre: ")
anios = int(input("Edad en años: "))
meses = anios * 12
print(nombre + ", has vivido unos", meses, "meses")`,
        steps: ['El nombre es texto: no se convierte.', 'La edad se convierte a `int` para poder multiplicar.', '`nombre + ","` une sin espacio; el resto se separa con comas.'],
        tests: [
          { desc: 'Laura, 20 → 240 meses', stdin: ['Laura', '20'], expect: ['Laura, has vivido unos 240 meses'] },
          { desc: 'Juan, 1 → 12 meses', stdin: ['Juan', '1'], expect: ['Juan, has vivido unos 12 meses'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'operadores',
    title: 'Operadores',
    short: 'Hacer cálculos, comparar valores y combinar condiciones.',
    keywords: [
      [/operador/g, 3, 'operador'], [/aritm[eé]tic/g, 2, 'aritméticos'], [/precedencia|prioridad de (los )?operadores/g, 2, 'precedencia'],
      [/\/\/|divisi[oó]n entera/g, 2, 'división entera'], [/m[oó]dulo|\bresto\b/g, 2, 'resto (%)'], [/\*\*|potencia/g, 2, 'potencia'],
      [/comparaci[oó]n|relacional/g, 2, 'comparación'], [/l[oó]gicos?\b|\band\b|\bor\b|\bnot\b/g, 1, 'lógicos'],
    ],
    terms: [
      ['Operador', 'Símbolo que hace una operación con valores: `+`, `-`, `*`, `/`, `==`, `and`…'],
      ['Expresión', 'Combinación de valores y operadores que Python calcula para obtener un resultado: `2 + 3 * 4`.'],
      ['Booleano', 'Un valor que solo puede ser `True` (verdadero) o `False` (falso). Lo producen las comparaciones.'],
    ],
    steps: [
      {
        title: 'Operaciones aritméticas',
        body: ['`+` suma, `-` resta, `*` multiplica y `/` divide (el resultado de `/` siempre es decimal).', '`**` es la potencia: `2 ** 3` es 2³ = 8.'],
        code: c`print(7 + 2)
print(7 - 2)
print(7 * 2)
print(7 / 2)
print(2 ** 3)`,
      },
      {
        title: 'División entera y resto',
        body: [
          '`//` hace la división entera (sin decimales) y `%` da el **resto** de la división.',
          'Truco útil: un número es par si `numero % 2` da 0.',
        ],
        code: c`print(17 // 5)   # 3 (cabe 3 veces)
print(17 % 5)    # 2 (sobran 2)
print(10 % 2)    # 0 → 10 es par`,
      },
      {
        title: 'Orden de las operaciones',
        body: ['Como en matemáticas: primero `**`, luego `*`, `/`, `//`, `%`, y al final `+` y `-`.', 'Usa paréntesis para cambiar el orden o para que quede más claro.'],
        code: c`print(2 + 3 * 4)     # 14
print((2 + 3) * 4)   # 20`,
      },
      {
        title: 'Comparaciones',
        body: [
          'Comparan dos valores y dan `True` o `False`: `==` igual, `!=` distinto, `<`, `>`, `<=`, `>=`.',
          'Ojo: `=` guarda un valor; `==` compara.',
        ],
        code: c`edad = 17
print(edad >= 18)
print(edad == 17)
print(edad != 20)`,
      },
      {
        title: 'Operadores lógicos',
        body: [
          '`and`: verdadero solo si **las dos** condiciones lo son. `or`: verdadero si **al menos una** lo es. `not`: invierte el valor.',
        ],
        code: c`nota = 7
print(nota >= 5 and nota <= 10)
print(nota < 0 or nota > 10)
print(not nota >= 5)`,
      },
    ],
    examples: [
      {
        title: 'Minutos a horas',
        code: c`minutos = 135
horas = minutos // 60
resto = minutos % 60
print(minutos, "minutos son", horas, "h y", resto, "min")`,
        explain: ['`//` cuenta las horas completas.', '`%` da los minutos que sobran.'],
      },
      {
        title: '¿Puede entrar?',
        code: c`edad = 16
con_permiso = True
print(edad >= 18 or con_permiso)`,
        explain: ['`or` da True si se cumple alguna condición.', 'Aquí la edad no llega a 18, pero tiene permiso: resultado True.'],
      },
    ],
    exercises: [
      {
        id: 'b-op-1', level: 1, title: 'Área del rectángulo',
        statement: 'Con `base = 8` y `altura = 3`, calcula el área en una variable `area` y muéstrala.',
        starter: 'base = 8\naltura = 3\n',
        hints: ['Área = base × altura.', 'Multiplicar es `*`.'],
        solution: c`base = 8
altura = 3
area = base * altura
print(area)`,
        steps: ['Multiplicamos con `*` y guardamos el resultado.', 'Lo mostramos con `print`.'],
        tests: [{ desc: 'area vale 24', call: 'area', equals: '24' }],
      },
      {
        id: 'b-op-2', level: 2, title: '¿Es par?',
        statement: 'Pide un número entero y muestra `True` si es par o `False` si no lo es (sin usar if).',
        starter: '',
        hints: ['Un número es par si el resto de dividir entre 2 es 0.', 'El resto se calcula con `%`.', '`print(n % 2 == 0)`'],
        solution: c`n = int(input("Número: "))
print(n % 2 == 0)`,
        steps: ['Convertimos el dato a entero.', '`n % 2` es 0 en los pares; la comparación `== 0` da True o False.'],
        tests: [
          { desc: 'Con 4 muestra True', stdin: ['4'], expect: ['True'] },
          { desc: 'Con 7 muestra False', stdin: ['7'], expect: ['False'] },
        ],
      },
      {
        id: 'b-op-3', level: 3, title: 'Segundos a h, min y s',
        statement: 'Pide una cantidad de segundos y muéstrala como horas, minutos y segundos. Ejemplo: con 3725 → `1 h 2 min 5 s`.',
        starter: '',
        hints: ['Una hora tiene 3600 segundos: `horas = total // 3600`.', 'Lo que sobra tras quitar las horas: `total % 3600`.', 'De ese sobrante, divide entre 60 para minutos y usa `% 60` para segundos.'],
        solution: c`total = int(input("Segundos: "))
horas = total // 3600
resto = total % 3600
minutos = resto // 60
segundos = resto % 60
print(horas, "h", minutos, "min", segundos, "s")`,
        steps: ['`// 3600` da las horas completas.', '`% 3600` da los segundos que no llegan a una hora.', 'Repetimos la idea con 60 para minutos y segundos.'],
        tests: [
          { desc: '3725 → 1 h 2 min 5 s', stdin: ['3725'], expect: ['1 h 2 min 5 s'] },
          { desc: '59 → 0 h 0 min 59 s', stdin: ['59'], expect: ['0 h 0 min 59 s'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'condicionales',
    title: 'Condicionales',
    short: 'Tomar decisiones con if, elif y else.',
    keywords: [
      [/\bif\b/g, 2, 'if'], [/\belif\b/g, 3, 'elif'], [/\belse\b/g, 2, 'else'], [/condicional/g, 3, 'condicional'],
      [/condici[oó]n/g, 2, 'condición'], [/estructuras? (de control|de selecci[oó]n|alternativa)|decisi[oó]n/g, 2, 'estructura de control'],
      [/sangr[ií]a|indentaci[oó]n|indentar/g, 2, 'sangría'],
    ],
    terms: [
      ['Condición', 'Una expresión que es verdadera (`True`) o falsa (`False`), como `edad >= 18`.'],
      ['Bloque', 'Grupo de líneas que van juntas. En Python se marca con la **sangría** (espacios al principio).'],
      ['Sangría', 'Espacios al inicio de una línea. Lo habitual son 4. Indica qué líneas están «dentro» del if.'],
    ],
    steps: [
      {
        title: 'Si se cumple, haz esto',
        body: [
          '`if` ejecuta un bloque de código **solo si** la condición es verdadera.',
          'Fíjate en dos cosas: la línea del `if` termina en **dos puntos** `:` y las líneas de dentro van **sangradas** (4 espacios).',
        ],
        code: c`edad = 20
if edad >= 18:
    print("Eres mayor de edad")
print("Esta línea se ejecuta siempre")`,
      },
      {
        title: 'Si no, haz lo otro',
        body: ['`else` (sin condición) indica qué hacer cuando la condición del `if` es falsa.'],
        code: c`nota = 4
if nota >= 5:
    print("Aprobado")
else:
    print("Suspenso")`,
      },
      {
        title: 'Varias opciones con elif',
        body: [
          '`elif` («si no, si…») añade más condiciones. Python las comprueba **en orden** y ejecuta solo el primer bloque cuya condición se cumpla.',
        ],
        code: c`nota = 7.5
if nota >= 9:
    print("Sobresaliente")
elif nota >= 7:
    print("Notable")
elif nota >= 5:
    print("Aprobado")
else:
    print("Suspenso")`,
      },
      {
        title: 'La sangría importa',
        body: [
          'Lo que está sangrado bajo el `if` pertenece a él. Si quitas la sangría, Python da un `IndentationError` o cambia el significado del programa.',
          'En el editor, al pulsar Intro tras `:` la sangría se añade sola.',
        ],
        code: c`x = 3
if x > 5:
    print("Mayor que 5")
    print("Esto también está dentro del if")
print("Esto está fuera")`,
      },
      {
        title: 'Condiciones compuestas',
        body: ['Puedes combinar condiciones con `and`, `or` y `not` (los viste en Operadores).'],
        code: c`temperatura = 25
if temperatura > 20 and temperatura < 30:
    print("Temperatura agradable")`,
      },
    ],
    examples: [
      {
        title: 'Positivo, negativo o cero',
        code: c`n = int(input("Número: "))
if n > 0:
    print("Positivo")
elif n < 0:
    print("Negativo")
else:
    print("Cero")`,
        explain: ['Se comprueban las condiciones en orden.', 'Si ni es mayor ni menor que 0, solo puede ser 0: lo recoge el `else`.'],
      },
      {
        title: 'Contraseña',
        code: c`clave = input("Contraseña: ")
if clave == "python123":
    print("Acceso permitido")
else:
    print("Contraseña incorrecta")`,
        explain: ['`==` compara textos: deben ser exactamente iguales (también en mayúsculas).'],
      },
    ],
    exercises: [
      {
        id: 'b-if-1', level: 1, title: 'Mayor de edad',
        statement: 'Pide la edad. Si es 18 o más, muestra `Mayor de edad`; si no, `Menor de edad`.',
        starter: '',
        hints: ['Convierte la edad con `int()`.', 'Usa `if edad >= 18:` y un `else:`.', 'No olvides los dos puntos y la sangría.'],
        solution: c`edad = int(input("Edad: "))
if edad >= 18:
    print("Mayor de edad")
else:
    print("Menor de edad")`,
        steps: ['Pedimos y convertimos la edad.', 'El `if` comprueba si es 18 o más.', 'El `else` cubre el resto de casos.'],
        tests: [
          { desc: '18 → Mayor de edad', stdin: ['18'], expect: ['Mayor de edad'] },
          { desc: '12 → Menor de edad', stdin: ['12'], expect: ['Menor de edad'] },
        ],
      },
      {
        id: 'b-if-2', level: 2, title: 'El mayor de dos',
        statement: 'Pide dos números enteros y muestra el mayor. Si son iguales, muestra `Son iguales`.',
        starter: '',
        hints: ['Necesitas tres casos: a mayor, b mayor, iguales.', 'Usa `if`, `elif` y `else`.'],
        solution: c`a = int(input("Primer número: "))
b = int(input("Segundo número: "))
if a > b:
    print(a)
elif b > a:
    print(b)
else:
    print("Son iguales")`,
        steps: ['Pedimos dos números.', 'Comparamos con `>` en dos condiciones.', 'Si ninguna se cumple, son iguales.'],
        tests: [
          { desc: '3 y 9 → 9', stdin: ['3', '9'], expect: ['9'] },
          { desc: '10 y 2 → 10', stdin: ['10', '2'], expect: ['10'] },
          { desc: '5 y 5 → Son iguales', stdin: ['5', '5'], expect: ['Son iguales'] },
        ],
      },
      {
        id: 'b-if-3', level: 3, title: 'Calificación',
        statement: 'Pide una nota (puede tener decimales). Muestra `Suspenso` (<5), `Aprobado` (5 a <7), `Notable` (7 a <9) o `Sobresaliente` (9 o más). Si la nota no está entre 0 y 10, muestra `Nota no válida`.',
        starter: '',
        hints: ['Usa `float()` porque puede tener decimales.', 'Comprueba primero si la nota no es válida: `nota < 0 or nota > 10`.', 'Después, ordena las condiciones de mayor a menor con `elif`.'],
        solution: c`nota = float(input("Nota: "))
if nota < 0 or nota > 10:
    print("Nota no válida")
elif nota >= 9:
    print("Sobresaliente")
elif nota >= 7:
    print("Notable")
elif nota >= 5:
    print("Aprobado")
else:
    print("Suspenso")`,
        steps: ['Convertimos con `float` para admitir decimales.', 'Descartamos primero los valores fuera de rango.', 'Como `elif` se comprueba en orden, basta con ir de mayor a menor.'],
        tests: [
          { desc: '9.5 → Sobresaliente', stdin: ['9.5'], expect: ['Sobresaliente'] },
          { desc: '7 → Notable', stdin: ['7'], expect: ['Notable'] },
          { desc: '5 → Aprobado', stdin: ['5'], expect: ['Aprobado'] },
          { desc: '3.2 → Suspenso', stdin: ['3.2'], expect: ['Suspenso'] },
          { desc: '12 → Nota no válida', stdin: ['12'], expect: ['Nota no válida'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'bucles',
    title: 'Bucles',
    short: 'Repetir instrucciones con for y while.',
    keywords: [
      [/\bfor\b/g, 2, 'for'], [/\bwhile\b/g, 3, 'while'], [/\bbucles?\b|\bciclos?\b|\blazos?\b/g, 3, 'bucle'], [/range\s*\(/g, 3, 'range('],
      [/iteraci[oó]n|iterar/g, 2, 'iteración'], [/repetici[oó]n|repetir/g, 1, 'repetir'], [/\bbreak\b/g, 2, 'break'],
      [/contador|acumulador/g, 2, 'contador/acumulador'],
    ],
    terms: [
      ['Bucle', 'Estructura que repite un bloque de código varias veces.'],
      ['Iteración', 'Cada una de las repeticiones de un bucle (cada «vuelta»).'],
      ['range()', 'Genera una secuencia de números: `range(5)` da 0, 1, 2, 3, 4 (no incluye el 5).'],
      ['Contador / acumulador', 'Variable que va sumando en cada vuelta: un contador suma 1, un acumulador suma valores.'],
    ],
    steps: [
      {
        title: 'Repetir un número de veces: for',
        body: [
          '`for` repite el bloque una vez por cada valor. Con `range(n)` repite n veces.',
          'La variable (`i` en el ejemplo) toma un valor distinto en cada vuelta.',
        ],
        code: c`for i in range(3):
    print("Vuelta número", i)`,
        note: '`range(3)` empieza en 0 y llega hasta 2: tres vueltas.',
      },
      {
        title: 'range con inicio y paso',
        body: ['`range(inicio, fin)` va desde inicio hasta fin - 1. `range(inicio, fin, paso)` avanza de paso en paso.'],
        code: c`for n in range(1, 6):
    print(n)
for n in range(10, 0, -2):
    print(n)`,
      },
      {
        title: 'Acumular resultados',
        body: [
          'Un patrón muy común: crear una variable **antes** del bucle y actualizarla **dentro**.',
        ],
        code: c`total = 0
for n in range(1, 5):
    total = total + n
    print("Sumo", n, "y llevo", total)
print("Total:", total)`,
      },
      {
        title: 'Repetir mientras se cumpla: while',
        body: [
          '`while` repite **mientras** la condición sea verdadera. Útil cuando no sabes cuántas vueltas habrá.',
          '¡Cuidado! Algo dentro del bucle debe cambiar la condición; si no, el bucle no termina nunca (bucle infinito). Si te pasa, pulsa **Detener**.',
        ],
        code: c`cuenta = 3
while cuenta > 0:
    print(cuenta)
    cuenta = cuenta - 1
print("¡Despegue!")`,
      },
      {
        title: 'Salir antes: break',
        body: ['`break` termina el bucle en ese momento. Se usa a menudo con `while True` para repetir hasta que ocurra algo.'],
        code: c`while True:
    respuesta = input("Escribe 'salir' para terminar: ")
    if respuesta == "salir":
        break
    print("Has escrito:", respuesta)`,
      },
    ],
    examples: [
      {
        title: 'Tabla de multiplicar',
        code: c`n = 7
for i in range(1, 11):
    print(n, "x", i, "=", n * i)`,
        explain: ['`i` va de 1 a 10.', 'En cada vuelta se calcula y se muestra una línea de la tabla.'],
      },
      {
        title: 'Pedir hasta que sea válido',
        code: c`nota = float(input("Nota (0-10): "))
while nota < 0 or nota > 10:
    print("Fuera de rango, prueba otra vez")
    nota = float(input("Nota (0-10): "))
print("Nota guardada:", nota)`,
        explain: ['El `while` vuelve a pedir el dato mientras no sea válido.', 'Dentro se pide de nuevo: así la condición puede cambiar.'],
      },
    ],
    exercises: [
      {
        id: 'b-loop-1', level: 1, title: 'Del 1 al 10',
        statement: 'Muestra los números del 1 al 10, uno por línea, usando un bucle `for`.',
        starter: '',
        hints: ['`range(inicio, fin)` no incluye el fin.', 'Usa `range(1, 11)`.'],
        solution: c`for n in range(1, 11):
    print(n)`,
        steps: ['`range(1, 11)` genera 1, 2, …, 10.', 'En cada vuelta, `print(n)` muestra el número.'],
        tests: [{ desc: 'Muestra del 1 al 10 en orden', expect: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] }],
      },
      {
        id: 'b-loop-2', level: 2, title: 'Suma hasta n',
        statement: 'Pide un número n y muestra la suma 1 + 2 + … + n. Por ejemplo, con 4 → `10`.',
        starter: '',
        hints: ['Crea `total = 0` antes del bucle.', 'Recorre `range(1, n + 1)`.', 'Dentro: `total = total + i`. Muestra `total` después del bucle (sin sangría).'],
        solution: c`n = int(input("n: "))
total = 0
for i in range(1, n + 1):
    total = total + i
print(total)`,
        steps: ['El acumulador `total` empieza en 0.', 'El bucle suma cada número de 1 a n.', 'El `print` va fuera del bucle para mostrar solo el resultado final.'],
        tests: [
          { desc: 'n = 4 → 10', stdin: ['4'], expect: ['10'] },
          { desc: 'n = 100 → 5050', stdin: ['100'], expect: ['5050'] },
        ],
      },
      {
        id: 'b-loop-3', level: 3, title: 'Adivina el número',
        statement: 'El número secreto es 7. Pide números hasta que la persona acierte. Si falla, di `Más alto` o `Más bajo`. Al acertar, muestra `¡Acertaste en N intentos!`.',
        starter: 'secreto = 7\n',
        hints: ['Usa un `while` que se repita mientras no acierte.', 'Lleva un contador de intentos que sume 1 en cada vuelta.', 'Dentro del bucle, compara con `if / elif` para dar la pista.'],
        solution: c`secreto = 7
intentos = 0
numero = -1
while numero != secreto:
    numero = int(input("Tu número: "))
    intentos = intentos + 1
    if numero < secreto:
        print("Más alto")
    elif numero > secreto:
        print("Más bajo")
print("¡Acertaste en", intentos, "intentos!")`,
        steps: ['`numero` empieza en -1 para que el `while` se ejecute al menos una vez.', 'En cada vuelta se pide un número y se cuenta el intento.', 'Si no acierta, se da una pista; el bucle termina cuando `numero == secreto`.'],
        tests: [
          { desc: '3, 9, 7 → pistas y 3 intentos', stdin: ['3', '9', '7'], expect: ['Más alto', 'Más bajo', 'Acertaste en 3 intentos'] },
          { desc: '7 → 1 intento', stdin: ['7'], expect: ['Acertaste en 1 intentos'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'cadenas-listas',
    title: 'Cadenas y listas',
    short: 'Trabajar con textos y con colecciones de datos.',
    keywords: [
      [/\bcadenas?\b/g, 3, 'cadena'], [/\bstrings?\b/g, 2, 'string'], [/\blistas?\b/g, 3, 'lista'], [/append\s*\(/g, 3, 'append('],
      [/len\s*\(/g, 2, 'len('], [/[ií]ndices?|posici[oó]n/g, 2, 'índice'], [/slicing|rebanad|subcadena|sublista/g, 2, 'slicing'],
      [/\.(upper|lower|split|join|replace|strip|find|count|pop|remove|insert|sort)\s*\(/g, 2, 'métodos'], [/\btuplas?\b/g, 1, 'tupla'],
      [/vocal(es)?|consonantes?|letras?|caracter(es)?|\bfrase\b|palabras?/g, 1, 'texto (letras, palabras)'],
    ],
    terms: [
      ['Cadena (str)', 'Secuencia de caracteres (letras, números, espacios…) entre comillas.'],
      ['Lista (list)', 'Colección ordenada de valores entre corchetes: `[3, 5, 8]`. Se puede modificar.'],
      ['Índice', 'Posición de un elemento. **Empieza en 0**: el primer elemento es el `[0]`.'],
      ['Método', 'Función que pertenece a un tipo de dato y se usa con un punto: `texto.upper()`, `lista.append(4)`.'],
    ],
    steps: [
      {
        title: 'Las cadenas tienen posiciones',
        body: [
          'Cada carácter de una cadena tiene un **índice** que empieza en 0. Con `[ ]` accedes a uno; con índices negativos, desde el final.',
          '`len()` dice cuántos caracteres tiene.',
        ],
        code: c`palabra = "Python"
print(palabra[0])    # P
print(palabra[-1])   # n (el último)
print(len(palabra))  # 6`,
      },
      {
        title: 'Trozos y métodos de texto',
        body: [
          '`texto[inicio:fin]` extrae un trozo (sin incluir fin).',
          'Algunos métodos útiles: `.upper()` mayúsculas, `.lower()` minúsculas, `.replace(a, b)` sustituir, `.strip()` quitar espacios de los extremos.',
        ],
        code: c`frase = "  Hola Mundo  "
limpia = frase.strip()
print(limpia[0:4])
print(limpia.upper())
print(limpia.replace("Mundo", "Python"))`,
      },
      {
        title: 'Listas',
        body: [
          'Una **lista** guarda varios valores en orden, entre corchetes y separados por comas.',
          'Se accede igual que en las cadenas: `lista[0]` es el primero. A diferencia de las cadenas, las listas **se pueden modificar**.',
        ],
        code: c`notas = [7, 5.5, 9]
print(notas[0])
notas[1] = 6
print(notas)
print(len(notas))`,
      },
      {
        title: 'Añadir y quitar',
        body: ['`.append(x)` añade al final; `.remove(x)` quita el primer valor igual a x; `.pop()` quita y devuelve el último.', '`x in lista` comprueba si un valor está en la lista.'],
        code: c`compra = ["pan", "leche"]
compra.append("huevos")
compra.remove("pan")
print(compra)
print("leche" in compra)`,
      },
      {
        title: 'Recorrer con for',
        body: ['`for` puede recorrer directamente los elementos de una lista (o los caracteres de una cadena).', '`sum()`, `max()` y `min()` funcionan con listas de números.'],
        code: c`notas = [7, 5, 9, 6]
for n in notas:
    print("Nota:", n)
print("Media:", sum(notas) / len(notas))`,
      },
    ],
    examples: [
      {
        title: 'Contar vocales',
        code: c`texto = input("Escribe una frase: ").lower()
vocales = 0
for letra in texto:
    if letra in "aeiouáéíóú":
        vocales = vocales + 1
print("Tiene", vocales, "vocales")`,
        explain: ['`.lower()` pasa todo a minúsculas para no tener que comprobar las mayúsculas.', 'El `for` recorre la frase letra a letra.', '`letra in "aeiou..."` comprueba si es vocal.'],
      },
      {
        title: 'Lista desde la entrada',
        code: c`numeros = []
for i in range(3):
    n = int(input("Número: "))
    numeros.append(n)
print("Has escrito:", numeros)
print("El mayor es", max(numeros))`,
        explain: ['Se empieza con una lista vacía `[]`.', 'En cada vuelta se añade un número con `.append()`.'],
      },
    ],
    exercises: [
      {
        id: 'b-str-1', level: 1, title: 'Primera y última letra',
        statement: 'Pide una palabra y muestra su primera letra y su última letra en líneas separadas.',
        starter: '',
        hints: ['La primera posición es la 0.', 'La última se puede obtener con el índice `-1`.'],
        solution: c`palabra = input("Palabra: ")
print(palabra[0])
print(palabra[-1])`,
        steps: ['`palabra[0]` es el primer carácter.', '`palabra[-1]` es el último, sin necesidad de saber la longitud.'],
        tests: [{ desc: '«casa» → c y a', stdin: ['casa'], expect: ['c', 'a'] }, { desc: '«Python» → P y n', stdin: ['Python'], expect: ['P', 'n'] }],
      },
      {
        id: 'b-str-2', level: 2, title: 'Media de una lista',
        statement: 'Dada la lista `notas = [6, 8, 5, 9, 7]`, calcula en `media` la nota media y muéstrala.',
        starter: 'notas = [6, 8, 5, 9, 7]\n',
        hints: ['La media es la suma dividida entre la cantidad.', '`sum(notas)` suma y `len(notas)` cuenta.'],
        solution: c`notas = [6, 8, 5, 9, 7]
media = sum(notas) / len(notas)
print(media)`,
        steps: ['`sum()` suma todos los elementos: 35.', '`len()` cuenta los elementos: 5.', '35 / 5 = 7.0'],
        tests: [{ desc: 'media vale 7', call: 'media', equals: '7' }],
      },
      {
        id: 'b-str-3', level: 3, title: 'Palabras largas',
        statement: 'Pide una frase y crea una lista `largas` con las palabras de más de 4 letras. Muéstrala. Pista: `frase.split()` separa una frase en una lista de palabras.',
        starter: '',
        hints: ['`palabras = frase.split()` da una lista de palabras.', 'Crea `largas = []` y recorre `palabras` con `for`.', 'Si `len(p) > 4`, haz `largas.append(p)`.'],
        solution: c`frase = input("Frase: ")
palabras = frase.split()
largas = []
for p in palabras:
    if len(p) > 4:
        largas.append(p)
print(largas)`,
        steps: ['`.split()` corta la frase por los espacios.', 'Recorremos cada palabra y comprobamos su longitud.', 'Las que cumplen se añaden a la lista `largas`.'],
        tests: [
          { desc: '«me gusta mucho programar» → [\'gusta\', \'mucho\', \'programar\']', stdin: ['me gusta mucho programar'], expect: ["['gusta', 'mucho', 'programar']"] },
          { desc: '«sol y mar» → []', stdin: ['sol y mar'], expect: ['[]'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'funciones',
    title: 'Funciones',
    short: 'Crear tus propias órdenes reutilizables con def y return.',
    keywords: [
      [/\bdef\b/g, 3, 'def'], [/\bfunci[oó]n(es)?\b/g, 2, 'función'], [/\breturn\b/g, 3, 'return'], [/par[aá]metros?/g, 3, 'parámetro'],
      [/argumentos?/g, 2, 'argumento'], [/devuelv[ae]n?|devolver|reciba (un|una|dos)|recibe (un|una|dos)/g, 2, 'devolver / recibir'], [/[aá]mbito|\bscope\b|variables? (local|global)/g, 2, 'ámbito'], [/\bllamada\b|llamar a/g, 1, 'llamada'],
    ],
    terms: [
      ['Función', 'Bloque de código con nombre que puedes ejecutar (llamar) cuando quieras.'],
      ['Parámetro', 'Variable de la función que recibe un dato cuando se la llama. Va entre los paréntesis del `def`.'],
      ['Argumento', 'El valor concreto que pasas al llamar: en `doble(5)`, el argumento es 5.'],
      ['return', 'Devuelve un resultado a quien llamó a la función y termina la función.'],
    ],
    steps: [
      {
        title: 'Definir y llamar',
        body: [
          'Con `def` creas una función: nombre, paréntesis, dos puntos y un bloque sangrado.',
          'Definirla **no** la ejecuta. Se ejecuta cuando la **llamas** escribiendo su nombre con paréntesis.',
        ],
        code: c`def saludar():
    print("¡Hola!")
    print("Bienvenido")

saludar()
saludar()`,
      },
      {
        title: 'Parámetros',
        body: ['Los parámetros permiten pasar datos a la función. Dentro, se usan como variables.'],
        code: c`def saludar(nombre):
    print("Hola,", nombre)

saludar("Ana")
saludar("Luis")`,
      },
      {
        title: 'Devolver un resultado: return',
        body: [
          '`return` envía un valor de vuelta. Así puedes guardar el resultado o usarlo en otra operación.',
          'Diferencia clave: `print` **muestra** en pantalla; `return` **devuelve** el valor al programa.',
        ],
        code: c`def doble(n):
    return n * 2

resultado = doble(5)
print(resultado)
print(doble(3) + 1)`,
      },
      {
        title: 'Variables locales',
        body: ['Las variables creadas dentro de una función solo existen dentro de ella (son **locales**). Fuera, Python no las conoce.'],
        code: c`def calcular():
    x = 10
    return x + 1

print(calcular())
# print(x)  # esto daría NameError: x solo existe dentro de calcular()`,
      },
    ],
    examples: [
      {
        title: 'Área de un círculo',
        code: c`def area_circulo(radio):
    return 3.1416 * radio ** 2

print(area_circulo(1))
print(area_circulo(2.5))`,
        explain: ['La función recibe el radio y devuelve el área.', 'Se puede llamar todas las veces que haga falta con distintos valores.'],
      },
      {
        title: 'Función con if',
        code: c`def es_par(n):
    return n % 2 == 0

for numero in range(1, 6):
    print(numero, es_par(numero))`,
        explain: ['`es_par` devuelve True o False.', 'El bucle la usa para cada número.'],
      },
    ],
    exercises: [
      {
        id: 'b-fn-1', level: 1, title: 'Función triple',
        statement: 'Crea una función `triple(n)` que **devuelva** el número multiplicado por 3.',
        starter: 'def triple(n):\n    \n',
        hints: ['Usa `return`, no `print`.', '`return n * 3`'],
        solution: c`def triple(n):
    return n * 3`,
        steps: ['`def triple(n):` define la función con un parámetro.', '`return n * 3` devuelve el resultado.'],
        tests: [
          { desc: 'triple(2) devuelve 6', call: 'triple(2)', equals: '6' },
          { desc: 'triple(-1) devuelve -3', call: 'triple(-1)', equals: '-3' },
          { desc: 'triple(0) devuelve 0', call: 'triple(0)', equals: '0' },
        ],
      },
      {
        id: 'b-fn-2', level: 2, title: 'El mayor de tres',
        statement: 'Crea `mayor(a, b, c)` que devuelva el mayor de los tres números **sin usar** `max()`.',
        starter: 'def mayor(a, b, c):\n    \n',
        hints: ['Supón que el mayor es `a` y guárdalo en una variable.', 'Si `b` es mayor que ese valor, actualízalo. Haz lo mismo con `c`.', 'Al final, `return` del valor guardado.'],
        solution: c`def mayor(a, b, c):
    m = a
    if b > m:
        m = b
    if c > m:
        m = c
    return m`,
        steps: ['Empezamos suponiendo que `a` es el mayor.', 'Comparamos con `b` y con `c`, actualizando si encontramos uno mayor.', 'Devolvemos el mayor encontrado.'],
        tests: [
          { desc: 'mayor(1, 5, 3) → 5', call: 'mayor(1, 5, 3)', equals: '5' },
          { desc: 'mayor(9, 2, 4) → 9', call: 'mayor(9, 2, 4)', equals: '9' },
          { desc: 'mayor(1, 2, 8) → 8', call: 'mayor(1, 2, 8)', equals: '8' },
          { desc: 'mayor(4, 4, 4) → 4', call: 'mayor(4, 4, 4)', equals: '4' },
        ],
      },
      {
        id: 'b-fn-3', level: 3, title: 'Contar aprobados',
        statement: 'Crea `contar_aprobados(notas)` que reciba una lista de notas y devuelva cuántas son 5 o más.',
        starter: 'def contar_aprobados(notas):\n    \n',
        hints: ['Necesitas un contador que empiece en 0.', 'Recorre la lista con `for`.', 'Suma 1 al contador cuando la nota sea `>= 5` y devuélvelo al final (fuera del bucle).'],
        solution: c`def contar_aprobados(notas):
    contador = 0
    for nota in notas:
        if nota >= 5:
            contador = contador + 1
    return contador`,
        steps: ['El contador empieza en 0.', 'Por cada nota aprobada sumamos 1.', 'El `return` va fuera del bucle; si estuviera dentro, la función terminaría en la primera vuelta.'],
        tests: [
          { desc: '[4, 5, 8, 2] → 2', call: 'contar_aprobados([4, 5, 8, 2])', equals: '2' },
          { desc: '[] → 0', call: 'contar_aprobados([])', equals: '0' },
          { desc: '[10, 9.5] → 2', call: 'contar_aprobados([10, 9.5])', equals: '2' },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'errores',
    title: 'Errores y depuración',
    short: 'Leer los mensajes de error, encontrar fallos y controlarlos con try/except.',
    keywords: [
      [/\berror(es)?\b/g, 2, 'error'], [/excepci[oó]n|excepciones/g, 3, 'excepción'], [/\btry\b/g, 2, 'try'], [/\bexcept\b/g, 3, 'except'],
      [/traceback/g, 3, 'traceback'], [/depura|debug/g, 3, 'depuración'], [/\b\w+error\b/g, 2, 'tipos de error'],
    ],
    terms: [
      ['Error (excepción)', 'Problema que detiene el programa. Python indica el **tipo** de error y la **línea** donde ocurrió.'],
      ['Traceback', 'El mensaje de error completo. Se lee **de abajo arriba**: la última línea dice qué pasó.'],
      ['Depurar', 'Buscar y corregir los fallos de un programa.'],
      ['try / except', 'Estructura para «intentar» algo y decidir qué hacer si falla, sin que el programa se detenga.'],
    ],
    steps: [
      {
        title: 'Equivocarse es normal',
        body: [
          'Todo el mundo comete errores al programar. El mensaje de error es una **ayuda**, no un castigo.',
          'Lee la **última línea**: dice el tipo de error (por ejemplo `NameError`) y una descripción. Un poco más arriba verás el número de línea.',
        ],
        code: c`print("Inicio")
print(mensaje)`,
        note: 'Ejecútalo: verás un NameError en la línea 2, la línea se marcará en el editor y aparecerá una explicación en español.',
      },
      {
        title: 'Errores de sintaxis',
        body: [
          'Un `SyntaxError` significa que algo está mal escrito: faltan dos puntos, paréntesis o comillas. El programa no llega a empezar.',
          'A veces Python señala la línea **siguiente** al fallo real: revisa también la anterior.',
        ],
        code: c`edad = 20
if edad > 18
    print("Mayor")`,
      },
      {
        title: 'Errores durante la ejecución',
        body: ['Otros errores aparecen al ejecutar: `TypeError` (tipos incompatibles), `ValueError` (valor no válido), `ZeroDivisionError`, `IndexError`…'],
        code: c`edad = input("Edad: ")
print(edad + 1)   # TypeError: edad es texto`,
      },
      {
        title: 'Depurar con print',
        body: [
          'Una técnica sencilla: añade `print` temporales para ver el valor de las variables en cada paso. Así descubres dónde deja de comportarse como esperabas.',
        ],
        code: c`total = 0
for n in [3, 4, 5]:
    total = total + n
    print("DEBUG n =", n, "total =", total)
print(total)`,
      },
      {
        title: 'Controlar errores: try / except',
        body: [
          'Si sabes que algo puede fallar (por ejemplo, que escriban letras donde esperas un número), ponlo dentro de `try`. Si falla, se ejecuta el bloque `except` en lugar de detenerse el programa.',
        ],
        code: c`try:
    n = int(input("Número: "))
    print("El doble es", n * 2)
except ValueError:
    print("Eso no es un número entero")`,
      },
    ],
    examples: [
      {
        title: 'Pedir hasta que sea un número',
        code: c`while True:
    try:
        n = int(input("Número entero: "))
        break
    except ValueError:
        print("No es válido, prueba otra vez")
print("Gracias, has escrito", n)`,
        explain: ['El bucle se repite hasta que la conversión funciona.', 'Si `int()` falla, salta el `except` y se vuelve a pedir; si funciona, `break` sale del bucle.'],
      },
      {
        title: 'División segura',
        code: c`a = 10
b = 0
try:
    print(a / b)
except ZeroDivisionError:
    print("No se puede dividir entre cero")`,
        explain: ['Se captura un tipo concreto de error: `ZeroDivisionError`.'],
      },
    ],
    exercises: [
      {
        id: 'b-err-1', level: 1, title: 'Arregla el programa',
        statement: 'Este programa tiene 3 errores. Ejecútalo, lee los mensajes y corrígelo hasta que muestre `La suma es 15`.',
        starter: c`numero1 = 10
numero2 = 5
suma = numero1 + Numero2
if suma == 15
    print("La suma es", sumaa)
`,
        hints: ['Ejecuta y corrige un error cada vez: empieza por el que indique Python.', 'Fíjate en las mayúsculas y en los dos puntos del `if`.', 'Revisa también el nombre de la variable dentro del `print`.'],
        solution: c`numero1 = 10
numero2 = 5
suma = numero1 + numero2
if suma == 15:
    print("La suma es", suma)`,
        steps: ['Faltaban los dos puntos al final del `if` (SyntaxError).', '`Numero2` con mayúscula no existe (NameError): es `numero2`.', '`sumaa` tenía una letra de más (NameError).'],
        tests: [{ desc: 'Muestra «La suma es 15»', expect: ['La suma es 15'] }],
      },
      {
        id: 'b-err-2', level: 2, title: 'Edad segura',
        statement: 'Pide la edad. Si la persona escribe algo que no es un número entero, muestra `Dato no válido` en lugar de un error. Si es válido, muestra `Edad: N`.',
        starter: '',
        hints: ['Usa `try:` y `except ValueError:`.', 'Pon dentro del `try` la conversión con `int()` y el `print` de la edad.'],
        solution: c`try:
    edad = int(input("Edad: "))
    print("Edad:", edad)
except ValueError:
    print("Dato no válido")`,
        steps: ['La conversión con `int()` puede fallar: va dentro de `try`.', 'Si falla, Python salta al `except ValueError` y muestra el aviso.'],
        tests: [
          { desc: '«20» → Edad: 20', stdin: ['20'], expect: ['Edad: 20'] },
          { desc: '«veinte» → Dato no válido', stdin: ['veinte'], expect: ['Dato no válido'] },
        ],
      },
      {
        id: 'b-err-3', level: 3, title: 'Media sin fallos',
        statement: 'Crea `media(lista)` que devuelva la media de una lista de números. Si la lista está vacía, debe devolver `0` en lugar de producir un error.',
        starter: 'def media(lista):\n    \n',
        hints: ['Con una lista vacía, `len(lista)` es 0 y dividir da `ZeroDivisionError`.', 'Puedes usar `try/except ZeroDivisionError` o comprobar antes con `if len(lista) == 0`.'],
        solution: c`def media(lista):
    try:
        return sum(lista) / len(lista)
    except ZeroDivisionError:
        return 0`,
        steps: ['La división normal da la media.', 'Con la lista vacía se produce ZeroDivisionError y el `except` devuelve 0.', 'Alternativa igual de válida: `if len(lista) == 0: return 0` antes de dividir.'],
        tests: [
          { desc: 'media([2, 4, 6]) → 4', call: 'media([2, 4, 6])', equals: '4' },
          { desc: 'media([]) → 0', call: 'media([])', equals: '0' },
          { desc: 'media([5]) → 5', call: 'media([5])', equals: '5' },
        ],
      },
    ],
  },
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

/** Todos los ejercicios propios de la app, con su tema. */
export const BUILTIN_EXERCISES = TOPICS.flatMap((t) =>
  t.exercises.map((e) => ({ ...e, topicId: t.id, origin: 'complemento' })));
