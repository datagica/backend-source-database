/* @flow weak */
'use strict'

const neo4j = require('neo4j');
const utils = require('../utils');

class Source {

  constructor(opts) {
    this.api = opts.api;

    this.settings = opts.settings;

    this.neo4j = new neo4j.GraphDatabase(this.settings.credentials.value.url.value);

    this.neo4j.cypher({
      query: this.settings.parameters.value.query.value,
      params: this.settings.parameters.value.params.value,
    }, (err, results) => {
        if (err) throw err;
        var result = results[0];
        if (!result) {
            console.log('No user found.');
        } else {
            var user = result['user'];
            console.log(user);
        }
    })

  }
}

Source.typeName = 'neo4j'

Source.typeLabel = {
  en: "Neo4J",
  fr: "Neo4J"
}

Source.typeDescription = {
  en: "graph database",
  fr: "Base de données graphe",
}

Source.typeTag = {
  en: 'graph',
  fr: 'graphe'
}

Source.defaults = {
  parameters: {
    label: {
      en: "Settings",
      fr: "Paramètres"
    },
    type: "group",
    value: {
      url: {
        label: {
          en: "Server URL",
          fr: "URL du serveur"
        },
        type: "url",
        value: "http://username:password@localhost:7474"
      },
      query: {
        label: {
          en: "Query",
          fr: "Requête"
        },
        type: "string",
        value: 'MATCH (user:User {email: {email}}) RETURN user'
      },
      data: {
        label: {
          en: "Input data",
          fr: "Données d'entrée"
        },
        type: "json",
        value: {
          email: 'alice@example.com'
        }
      }
    }
  }
}

Source.meta = {
  typeName:        Source.typeName,
  typeLabel:       Source.typeLabel,
  typeDescription: Source.typeDescription,
  typeTag:         Source.typeTag,
  defaults:        Source.defaults
}

module.exports = Source
