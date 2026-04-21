
```bash
  _______  _______  ______   _______  _______ 
 (  ____ )(  ___  )(  __  \ (  ___  )(  ____ )
 | (    )|| (   ) || (  \  )| (   ) || (    )|
 | (____)|| (___) || |   ) || (___) || (____)|
 |     __)|  ___  || |   | ||  ___  ||  __  )
 | (\ (   | (   ) || |   ) || (   ) || (  \  )
 | ) \ \__| )   ( || (__/  )| )   ( || )   \ \
 |/   \__/|/     \|(______/ |/     \||/     \|

```

#   RADAR: Reconnaissance & Advanced Data Analysis Runtime

RADAR es un motor de reconocimiento pasivo y activo diseñado para la detección temprana de superficies de ataque. A diferencia de los escáneres genéricos, RADAR implementa un pipeline de datos tipado en TypeScript que normaliza activos y clasifica objetivos mediante lógica de infraestructura.



#   Clone the repository:
```git clone https://github.com/Chmod351/radar-osint cd radar```

1. Construir la Imagen

Desde la raíz del proyecto, ejecutá:

```docker build -t radar .```

2. Ejecutar un Escaneo

`javascript docker run --rm -it -v $(pwd):/app --entrypoint bun radar run src/core/orchestrator.ts target.com`

![]()

## BODY:

```javascript
{
    {
    host: "domain.com",
    ip: "50.000.000",
    app_status: "PENDING",
    whois_raw: null,
    asn: "AS66666",
    asn_owner: "50.000.0.0/00",
    country: "US",
    url: "https://www.www.com",
    status_code: 301,
    title: "301 Moved Permanently",
    webserver: "Apache/2.4.6 (CentOS)",
    cdn: 0,
    infra_type: 2,
    infra_status: 4,
    priority: 0,
    action: 1,
    attemps:[{
      method:"HEAD",
      header:null,
      status:0,
      size:0,
      timestamp:new Date().toISOString() 
    }],
    http_stack: [
    {
        "name": "Apache",
        "version": "2.4.38"
      },
      {
        "name": "Google-Analytics",
        "version": "Universal"
      },
     ],
    open_ports: [
    {
        "port": 53,
        "protocol": "tcp",
        "service": "domain"
      },
      {
        "port": 80,
        "protocol": "tcp",
        "service": "http"
      },
      {
        "port": 443,
        "protocol": "tcp",
        "service": "https"
      },

    ],
    vulnerabilities: ["string"],
    http_intel: {
      protocol: 0,
      status: 0,
      security:{
        "hsts": false,
        "csp": false,
        "xfo": false,
        "nosniff": false
      },
      ,
      server: null,
      poweredBy: null,
      cookies: false,
      error: null,
    },
    whois: {
      registrar: null,
      creationDate: null,
      expirationDate: null,
      nameServers: [],
      status: [],
      emails: null,
      raw: "",
    },
  }
}
```
#   ⚠️ Disclaimer

Este proyecto NO ESTA TERMINADO y se encuentra en constante cambio

Esta herramienta fue creada para la gestión de activos y auditoría de seguridad autorizada. El uso en sistemas sin consentimiento es responsabilidad del usuari

