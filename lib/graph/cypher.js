/* @flow weak */
'use strict'

const PollingTemplate = require('@datagica/backend-source').PollingTemplate

const Cypher = require('cypher-stream')

class Template extends PollingTemplate {

  start () {

    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    const config = this.config;
    const settings = config.settings;
    const credentials = settings.credentials.value;

    // console.log("[database/mysql] refreshing data..")

    this.cypher = Cypher(
      credentials.url.value,
      credentials.username.value,
      credentials.password.value
    );

    this.poll()
  }

  stop () {
    if (!this.isRunning) {
      return
    }
    this.isRunning = false
    if (this.cypher && typeof this.cypher.destroy === 'function') {
      this.cypher.destroy()
    }
  }

  sync () {

    // console.log("[database/mysql] refreshing data..")

    const config      = this.config
    const credentials = config.settings.credentials.value

    const query = this.settings.credentials.value.query.value

    this.stream = this.cypher(query)
    .on('data', data => {
      console.error("[database/cypher] data: "+JSON.stringify(data, null, 2))
      opts.onAdd.onAdd(data).then(_ => {
        console.error("[database/cypher] successfully added record")
      }).catch(err => {
        console.error("[database/cypher] couldn't add record: "+err)
      })
    })
    .on('error', err => {
      console.error("[database/cypher] error: "+err)
    })
    .on('end', () => {
        console.error("[database/cypher] end of stream")
    })

    this.resume()
  }
}

Template.templateId = 'cypher'

Template.templateLabel = {
  en: "Cypher",
  fr: "Cypher"
}

Template.templateDescription = {
  en: "For graph databases",
  fr: "Bases de type graphe",
}

Template.settings = {
  parameters: {
    label: {
      en: "Settings",
      fr: "Paramètres"
    },
    type: "group",
    value: {
      url: {
        label: {
          en: "URL",
          fr: "URL"
        },
        type: "url",
        value: "bolt://localhost"
      },
      username: {
        label: {
          en: "Username",
          fr: "Utilisateur"
        },
        type: "string",
        value: ""
      },
      password: {
        label: {
          en: "Password",
          fr: "Mot de passe"
        },
        type: "password",
        value: ""
      },
      query: {
        label: {
          en: "Query",
          fr: "Requête"
        },
        type: "string",
        value: 'MATCH (user:User {email: {email}}) RETURN user'
      },
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
