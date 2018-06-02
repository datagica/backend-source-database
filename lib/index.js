/* @flow weak */
'use strict'

const TemplateBundle = require('@datagica/backend-source').TemplateBundle

// const SQLite3Source = require('./sql/sqlite3')
const MySQL    = require('./sql/mysql')
const Postgres = require('./sql/postgres')
const Cypher   = require('./graph/cypher')

class Bundle extends TemplateBundle {

  constructor() {
    super({
      name: "database",
      label: {
        en: "Databases",
        fr: "Bases de données"
      },
      description: {
        en: "Graph, SQL and NoSQL databases",
        fr: "Bases graphe, SQL et NoSQL"
      },
      templates: [
        MySQL,
        Postgres,
        Cypher
      ]
    })
  }
}

module.exports = Bundle
