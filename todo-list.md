## Limpiar proyecto
Se va a dejar lo minimo necesario de la extension en el proyecto para crear una nueva.
- [ ] Eliminar logica relacionada a Recargar pagina sin cache
- [ ] Eliminar seccion de alertas y logica relacionada a alertas
- [ ] Eliminar seccion de Digital DAta

## Reciclar
Estilos, flujos, estado de datos, almacenamiento en memoria, buscadores
Seccion de Tag Managers

## Nuevas funcionalidades
La extension va a mostrar las llamadas a distintos pixels, por ejemplo: RTB HOuse, Pinterest, Meta, Criteo.
Las secciones de los pixels muestran los eventos que se han enviado a los servidores. Estos eventos se muestran colapsados y se les puede revisar los detalles haciendo click para expandirlos.
### Sidepanel de Chrome
- [ ] Agregar Seccion para Criteo.

### Panel de configuracion
Es necesairo un panel donde se pueda configurar los eventos para poder traducir los datos enviados a una tabla ordenada legible por humanos.
Ejemplo de url:
```
https://sslwidget.criteo.com/event?a=100200&v=5.50.0&p0=e%3Dce%26m%3D%255B%255D%26h%3Dnone&p1=e%3Dexd%26z%3Dundefined%26site_type%3Dd&p2=e%3Dvc%26id%3D1600314542%26c%3DMXN%26p%3D%255Bi%25253D546119%252526pr%25253D4499%252526q%25253D1%255D%26tms%3Dgtm-ee-1.1.0&p3=e%3Ddis&bundle=Ue3Fj182QkxMJTJGMDd1ZEgxUFhuTnpaZE00SE81cjd1dWY4JTJCellkclZmMWRXeHluNjVYbGRxJTJGQSUyRno1dlVxalpacTlXQlA3bnJLUCUyRmF1a2pxMXhKbGFJY0VTVWlKTlklMkJXJTJGNGRXN1hFdnJOZTNXNGwyVTJkJTJGUjBJRWF3bVJ6S2dXWFYyYmZrTFM3cFdDQkkwcWtQMmdGeWhNJTJGcVElM0QlM0Q&sc=%7B%22fbp%22%3A%22fb.2.1786229428567.143474270945031341%22%2C%22ttp%22%3A%2201KZHS44DEC9JSGXQNH3TBBVJD_.tt.2%22%7D&tld=sodimac.com.mx&dy=1&fu=https%253A%252F%252Fwww.sodimac.com.mx%252Fsodimac-mx%252Fcheckout%252Forderconfirmation&pu=https%253A%252F%252Fwww.sodimac.com.mx%252F&ceid=7e219c91-31f2-4d28-9e4d-fbdadfa97f8c
```
Ejemplo de tabla:

|Key | Value|
|---|---|
|event|view checkout|
|id|1600314542|
|currency|MXN|
|items|[{id:"546119",price:4499,quantity:1}]
