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
      client: 'postgres',
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

    console.log("[database/postgres] syncing data..")

    const config      = this.config
    const credentials = config.settings.credentials.value
    const host        = credentials.host.value
    const port        = credentials.port.value
    const dbName      = credentials.database.value

    return this.getSchema().then(schema => {
      console.log("[database/postgres] got schema:" +JSON.stringify(schema, null, 2))
      return Promise.all(Object.keys(schema).map(table =>
        this.getDocuments(table, schema[table]).then(rows => {
          console.log("[database/postgres]  - GOT ROWS: "+JSON.stringify(rows, null, 2))
          return Promise.all(rows.map((row, i) => {

            const uri  = `postgres://${host}:${port}/${dbName}/${table}#${i}`
            const name = `${table} #${i}`

            const text = JSON.stringify(row, null, 2)
            const hash = this.hash({
              uri: uri,
              text: text
            });
            console.log(`[database/postgres]  - GOT ROW: ${JSON.stringify(row, null, 2)}`)
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
              console.log(`[database/postgres] [${host}:${port}/${dbName}] processed row ${i} in ${table}`)
              return Promise.resolve(true)
            }).catch(err => {
              console.log(`[database/postgres] [${host}:${port}/${dbName}] failed to process row ${i} in ${table}: `+err)
              return Promise.resolve(false)
            })
          }))
        })
      ))
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
    // console.log("getSchema")
    return new Promise((resolve, reject) => {
      const schema = {};
      this.knex
      .select('tablename')
      .from('pg_tables')
      .where('schemaname', 'public')
      .then(rows => {
        // console.log("rows: "+JSON.stringify(rows, null, 2))
        let remaining = rows.length;
        if (remaining == 0) {
          resolve({})
        }
        rows.forEach(row => {
          // console.log("row:  - "+JSON.stringify(row, null, 2))
          schema[row.tablename] = {};
          // this.knex.raw(`SELECT * FROM info_schema.columns WHERE table_schema = 'public'AND table_name = '${row.tablename}'`).then(columns => {
          this.knex.raw(`select * from ${row.tablename} where false`).then(resp => {
             const columns = resp.fields
            // console.log("columns: "+JSON.stringify(columns, null, 2))

            columns.forEach(column => {
              schema[row.tablename][column.name] = column.format;
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
      });
    })
  }
}

Template.templateId = 'postgres'

Template.templateLabel = {
  en: "Postgres",
  fr: "Postgres"
}

Template.templateDescription = {
  en: "SQL database",
  fr: "Base de données SQL"
}

Template.settings = {
  credentials: {
    label: {
      en: "Credentials",
      fr: "Identifiants"
    },
    type: "group",
    value: {
      host: {
        label: {
          en: "Host",
          fr: "Adresse hôte"
        },
        vartype: "string",
        type: "string",
        value: typeof process.env.DEFAULT_POSTGRES_HOST === "string" ? process.env.DEFAULT_POSTGRES_HOST : "127.0.0.1" // to save time during dev, we try to init with env vars if available
      },
      port: {
        label: {
          en: "Port",
          fr: "Port"
        },
        type: "number",
        value: 5432
      },
      user: {
        label: {
          en: "Username",
          fr: "Utilisateur"
        },
        vartype: "string",
        type: "string",
        value: typeof process.env.DEFAULT_POSTGRES_USER === "string" ? process.env.DEFAULT_POSTGRES_USER : "root"
      },
      password: {
        label: {
          en: "Password",
          fr: "Mot de passe"
        },
        vartype: "string",
        type: "text",
        value: typeof process.env.DEFAULT_POSTGRES_PASSWORD === "string" ? process.env.DEFAULT_POSTGRES_PASSWORD : ""
      },
      database: {
        label: {
          en: "Database name",
          fr: "Nom de la base"
        },
        vartype: "string",
        type: "string",
        value: typeof process.env.DEFAULT_POSTGRES_DATABASE === "string" ? process.env.DEFAULT_POSTGRES_DATABASE : "postgres"
      }
    }
  },
  parameters: {
    label: {
      en: "Parameters",
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
