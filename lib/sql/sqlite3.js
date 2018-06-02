/* @flow weak */
'use strict'

const Knex = require('knex');

const utils = require('../utils');

class Source {

  constructor(opts) {
    this.api = opts.api;

    this.settings = opts.settings;

    this.knex = Knex({
      dialect: 'sqlite3',
      connection: {
        filename: this.settings.parameters.value.filepath.value
      }
    })

    this.running = true;
    this.poll()
  }

  stop() {
    this.running = false
  }

  poll(){
    if (this.running) {
      //console.log("polling..");
      this.sync().then(done => {
        //console.log("sync done");
        if (this.running) {
          setTimeout(() => {
            this.poll()
          }, this.settings.parameters.value.interval.value)
        }
      })

    }
  }

  sync(){
    //console.log("sync..")
    return this.getSchema().then(schema => {
      //console.log("got schema:" +JSON.stringify(schema, null, 2))
      Object.keys(schema).map(table => {
        this.getDocuments(table, schema[table]).then(rows => {
          //console.log(" - GOT ROWS: "+JSON.stringify(rows, null, 2))
          rows.map(row => {
            const hash = utils.hash(JSON.stringify(row));
            //console.log(" - GOT ROW: "+JSON.stringify(row, null, 2))
            this.api.open({
              uri: `sqlite3://${this.settings.parameters.value.filepath.value}/${table}`,
              hash: hash,
              date: {
                lastChanged: new Date(),
                elapsed: 0
              },
              data: row
            })
          })
        })
      })
      return Promise.resolve(true)
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
      .column([
        'name',
        'sql'
      ])
      .select()
      .from('sqlite_master')
      .where({type: 'table'})
      .then(rows => {
        //console.log("rows: "+rows)
        let remaining = rows.length;
        if (remaining == 0) {
          resolve({})
        }
        rows.forEach(row => {
          //console.log("row:  - "+JSON.stringify(row))
          schema[row.name] = {};
          this.knex.raw(`pragma table_info(${row.name})`).then(columns => {
            //console.log("columns: "+JSON.stringify(columns))

            columns.forEach(column => {
              schema[row.name][column.name] = column.type;
            });

            if (--remaining == 0) {
              resolve(schema)
            }
          }).catch(err => {
            remaining = -1;
            //console.error(err)
            reject(err)
            // cb(error);
          });
        });
      });
    })
  }
}

Source.typeName = 'sqlite3'

Source.typeLabel = {
  en: "SQLite3",
  fr: "SQLite3"
}

Source.typeDescription = {
  en: "SQL database",
  fr: "Base de données SQL"
}

Source.typeTag = {
  en: 'sql',
  fr: 'sql'
}

Source.settings = {
  parameters: {
    label: {
      en: "Settings",
      fr: "Paramètres"
    },
    type: "group",
    value: {
      filepath: {
        label: {
          en: "Path",
          fr: "Chemin"
        },
        type: "file",
        value: "./test.db"
      },
      interval: {
        label: {
          en: "Interval (ms)",
          fr: "Intervalle (ms)"
        },
        type: "number",
        value: 10000
      }
    }
  }
}

Source.meta = {
  typeName:        Source.typeName,
  typeLabel:       Source.typeLabel,
  typeDescription: Source.typeDescription,
  typeTag:         Source.typeTag,
  settings:        Source.settings
}

module.exports = Source
