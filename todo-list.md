## Agregar traduccion de query parameters
Convierte cada query param en un details con summary, actualmente se muestra el nombre y valor del parametro, estos deben ir en el summary.
Si se abre el details, quiero que se muestre una traduccion a json del valor del query param.

La traduccion tiene que poder transformar esto:
url completa:
```
https://sslwidget.criteo.com/event?a=nnnnnn&v=5.50.0&p0=e%3Dce%26m%3D%255B3b2bdca572f2bb14cba6d83bf0c91e1627b0a24e791e9af16869520e5ead5b6c%255D%26h%3Dsha256&p1=e%3Dexd%26site_type%3Dd&p2=e%3Dvb%26c%3DCLP%26p%3D%255Bi%25253D150858809%252526pr%25253D2490%252526q%25253D1%252Ci%25253D110151593%252526pr%25253D159990%252526q%25253D1%255D&p3=e%3Ddis&bundle=SX63Gl9tbmw2TG9KZDJ4a3lUJTJGNFZSUkJ6QUFOaTdvbHMxT3dFWnRhM0g3a2Z1anYyS3c2bHZuUjZ4aFBEc1RnVFRYVlZjTEIxUFJvJTJGSGVCJTJCb1ZubGwxMzBPSWNsUlAxZDk4YjJxVjhsMjhYRXpET25IdXluU3N6RDRhNG9id04xN25SYll3NHFRZiUyQjQzUk96emclMkJxR1A4TmV3JTNEJTNE&sc=%7B%22fbp%22%3A%22fb.1.1788187922349.831344237149549334%22%2C%22ttp%22%3A%2201M1C4WNCJXDGTNG1QGA7WJPTW_.tt.1%22%7D&tld=sodimac.cl&dy=1&fu=https%253A%252F%252Fwww.sodimac.cl%252Fsodimac-cl%252Fbasket&pu=https%253A%252F%252Fwww.sodimac.cl%252Fsodimac-cl%252Fbuscar%253FNtt%253Dvaso%252Bacrilico&ceid=8f7b8872-3665-4053-a184-e8de08dc5e16
```

url encoded del param **p2**:
```
e%3Dvb%26c%3DCLP%26p%3D%255Bi%25253D150858809%252526pr%25253D2490%252526q%25253D1%252Ci%25253D110151593%252526pr%25253D159990%252526q%25253D1%255D
```

url decoded:
```
e=vb&c=CLP&p=%5Bi%253D150858809%2526pr%253D2490%2526q%253D1%2Ci%253D110151593%2526pr%253D159990%2526q%253D1%5D
```

json decoded:
```json
{
    "e": "vb",
    "c": "CLP",
    "p": [
        {
            "i":"150858809",
            "p":2490,
            "q":1
        },
        {
            "i":"110151593",
            "p":159990,
            "q":1
        },
    ]

}
```

## Traduccion:
> agregar traduccion aqui
