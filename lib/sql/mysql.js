/* @flow weak */
'use strict'

const PollingTemplate = require('@datagica/backend-source').PollingTemplate

const Knex = require('knex');

class Template extends PollingTemplate {

  start () {

    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    const config = this.config;
    const settings = config.settings;
    const credentials = settings.credentials.value;

    this.knex = Knex({
      client: 'mysql',
      connection: {
        host     : credentials.host.value,
        port     : credentials.port.value,
        user     : credentials.user.value,
        password : credentials.password.value,
        database : credentials.database.value
      }
    })
    this.poll()
  }

  sync () {

    // console.log("[database/mysql] refreshing data..")

    const config      = this.config
    const credentials = config.settings.credentials.value
    const host        = credentials.host.value
    const port        = credentials.port.value
    const dbName      = credentials.database.value

    return this.getSchema().then(schema => {
      // console.log("[database/mysql] got schema:" +JSON.stringify(schema, null, 2))
      return Promise.resolve(Object.keys(schema).map(table =>
        this.getDocuments(table, schema[table]).then(rows => {
          // console.log("[database/mysql]  - GOT ROWS: "+JSON.stringify(rows, null, 2))
          return Promise.all(rows.map((row, i) => {

            const uri  = `mysql://${host}:${port}/${dbName}/${table}#${i}`
            const name = `${table} #${i}`

            const text = JSON.stringify(row, null, 2)
            const hash = this.hash({
              uri: uri,
              text: text
            });
            // console.log(`[database/mysql]  - GOT ROW: ${JSON.stringify(row, null, 2)}`)
            return config.saveRecord({
              uri: uri,
              date: {
                lastChanged: new Date(),
                elapsed: 0
              },
              hash       : hash,
              bundleId   : config.bundleId,
              templateId : config.templateId,
              sourceId   : config.sourceId,
              name       : name,
              text       : text
            }).then(_ => {
              console.log(`[database/mysql] [${host}:${port}/${dbName}] processed row ${i} in ${table}`)
              return Promise.resolve(true)
            }).catch(err => {
              console.log(`[database/mysql] [${host}:${port}/${dbName}] failed to process row ${i} in ${table}: `+err)
              return Promise.resolve(false)
            })


          })
        )
        })
      )
    )
    })
  }

  getDocuments(tableName, tableSchema){
    //console.log("columns: "+ Object.keys(tableSchema))
    //console.log("tableName: "+tableName)
    return this.knex
      .select(Object.keys(tableSchema))
      .from(tableName)
  }

  getSchema(){
    //console.log("getSchema")
    return new Promise((resolve, reject) => {
      const schema = {};
      this.knex
      .raw('show tables')
      //.from('information_schema.tables')
      .then(schemas => {
        //console.log("schemas: "+JSON.stringify(schemas, null, 2))
        let remaining = schemas.length;
        if (remaining == 0) {
          resolve({})
        }
        schemas.forEach(tables => {
          //console.log("\n  - tables: "+JSON.stringify(tables, null, 2))

          tables.forEach(rawTable => {
            //console.log("    - rawTable: "+JSON.stringify(rawTable, null, 2))

            if (rawTable.db === 'information_schema') return;

            // yeah it's wtf : {"Tables_in_test": "clients" }
            const tableNameKey = Object.keys(rawTable)[0];
            const table = {
              name: rawTable[tableNameKey]
            }

            schema[table.name] = {};
            this.knex.raw(`describe ${table.name}`).then(rawColumns => {

              const columns = rawColumns[0];

              //console.log("      - columns: "+JSON.stringify(columns, null, 2))

              columns.forEach(column => {
                schema[table.name][column.Field] = column.Type;
              });

              if (--remaining == 0) {
                resolve(schema)
              }
            }).catch(err => {
              remaining = -1;
              console.error(err)
              reject(err)
              // cb(error);
            });
          });
        })
      });
    })
  }
}

Template.templateId = 'mysql'

Template.templateLabel = {
  en: "MySQL",
  fr: "MySQL"
}

Template.templateDescription = {
  en: "SQL database",
  fr: "Base de données SQL"
}

Template.settings = {
  credentials: {
    label: {
      en: "Database credentials",
      fr: "Identification au serveur"
    },
    type: "group",
    value: {
      host: {
        label: {
          en: "Hostname",
          fr: "Serveur"
        },
        type: "text",
        value: "localhost"
      },
      port: {
        label: {
          en: "Port",
          fr: "Port"
        },
        type: "number",
        value: 3306
      },
      user: {
        label: {
          en: "Username",
          fr: "Utilisateur"
        },
        type: "string",
        value: "root"
      },
      password: {
        label: {
          en: "Password",
          fr: "Mot de passe"
        },
        type: "string",
        value: "root"
      },
      database: {
        label: {
          en: "Database",
          fr: "Nom de la base"
        },
        type: "string",
        value: "test"
      }
    }
  },
  parameters: {
    label: {
      en: "Settings",
      fr: "Paramètres"
    },
    type: "group",
    value: {
      interval: {
        label: {
          en: "Time interval (ms)",
          fr: "Intervalle (ms)"
        },
        type: "number",
        value: 30000
      }
    }
  }
}

Template.meta = {
  templateId:          Template.templateId,
  templateLabel:       Template.templateLabel,
  templateDescription: Template.templateDescription,
  settings:            Template.settings
}

module.exports = Template
