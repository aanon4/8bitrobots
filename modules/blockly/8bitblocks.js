 document.addEventListener('DOMContentLoaded', function()
 {
  const UUID = function()
  {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };

  Blockly.Field.prototype.maxDisplayLength = 100;

  function buildProgramBlocks()
  {
    Blockly.Blocks['activity'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: 'Setup %1',
          args0:
          [
            {
              type: 'input_statement',
              name: 'SETUP'
            }
          ],
          message1: 'Then on activity',
          message2: 'do %1',
          args2:
          [
            {
              type: 'input_statement',
              name: 'ACTIVITY'
            }
          ],
          colour: 120
        });
      }
    };
    Blockly.JavaScript['activity'] = function(block)
    {
      const setup = Blockly.JavaScript.statementToCode(block, 'SETUP');
      const loop = Blockly.JavaScript.statementToCode(block, 'ACTIVITY');
      const code = `App.registerActivity(async function()
      {
        try
        {
          ${setup}
          while (!__status.terminated)
          {
            await App.sync('${UUID()}', __status);
            ${loop}
          }
        }
        catch (e)
        {
          if (!__status.terminated)
          {
            App.print(e);
          }
        }
      });\n`;
      return code;
    };

    const idx = TOOLBOX.indexOf('<category name="Program">');
    if (idx !== -1)
    {
      TOOLBOX[idx + 1] = `
        <block type="activity"></block>
      `;
    }
    WORKSPACE.updateToolbox(TOOLBOX.join());
  }

  function buildConfigBlocks(services)
  {
    const configureBlocks = [];
    let blocks = 0;
    services.forEach((service) => {

      const name = service.name;
      const schema = service.schema;

      const CONFIG = NODE.proxy({ service: name });
      CONFIG({}).then((config) => {
        let json =
        {
          message0: `Configure ${name.substr(0, name.length - 7)}`,
          colour: 90
        };
        let count = 1;
        for (let key in schema)
        {
          if (key !== '__return')
          {
            if (typeof schema[key] === 'object')
            {
              let def = schema[key].indexOf(config[key]);
              if (def !== -1)
              {
                schema[key].splice(def, 1);
                schema[key].unshift(config[key]);
              }
              json[`args${count}`] = [
              {
                type: 'field_dropdown',
                name: key,
                check: 'String',
                options: schema[key].map((value) => [ value, value ])
              }];
            }
            else
            {
              switch (schema[key])
              {
                case 'String':
                default:
                  json[`args${count}`] = [
                  {
                    type: 'field_input',
                    name: key,
                    text: key in config ? config[key] : ''
                  }];
                  break;
                case 'Number':
                  json[`args${count}`] = [
                  {
                    type: 'field_number',
                    name: key,
                    value: key in config ? config[key] : 0
                  }];
                  break;
                case 'Boolean':
                  json[`args${count}`] = [
                  {
                    type: 'field_checkbox',
                    name: key,
                    checked: key in config ? !!config[key] : false
                  }];
                  break;
              }
            }
            json[`message${count}`] = `${key == 'friendlyName' ? 'name' : key} %1`;
            count++;
          }
        }
    
        let changes = {};
        Blockly.Blocks[name] =
        {
          init: function()
          {
            this.jsonInit(json);
          },

          onchange: function(e)
          {
            switch (e.type)
            {
              case Blockly.Events.BLOCK_CHANGE:
                if (this.id !== e.blockId)
                {
                  break;
                }
                changes[e.name] = e.newValue;
                break;
              case Blockly.Events.UI:
                if (e.element === 'selected' && e.oldValue === this.id)
                {
                  if (Object.keys(changes).length)
                  {
                    CONFIG(changes).then((newConfig) => {
                      changes = {};
                      config = newConfig;
                      rebuildEventAndActionBlocks();
                    });
                  }
                }
                break;
              default:
                break;
            }
          }
        };
        Blockly.JavaScript[name] = function(block)
        {
          const code = `App.registerConfiguration(function()
          {
            return NODE.proxy({ service: '${name}' })(${JSON.stringify(config)}).then(() => {
              NODE.unproxy({ service: '${name}' });
            });
          });\n`;

          return code;
        };

        configureBlocks.push(`<block type="${name}" />`);

        if (++blocks == services.length)
        {
          const idx = TOOLBOX.indexOf('<category name="Configure">');
          if (idx !== -1)
          {
            TOOLBOX[idx + 1] = configureBlocks.join();
          }
          WORKSPACE.updateToolbox(TOOLBOX.join());
        }
      });
    });
  }

  function buildActionBlocks(actions)
  {
    const actionBlocks = [];
    actions.forEach((action) => {
      
      let json =
      {
        message0: `Set ${action.friendlyName ? action.friendlyName : action.name}`,
        previousStatement: null,
        nextStatement: null,
        inputsInline: true,
        colour: 90
      };
      let count = 0;
      for (let key in action.schema)
      {
        if (key !== '__return')
        {
          if (typeof action.schema[key] !== 'object')
          {
            json[`args${count}`]= [
            {
              type: 'input_value',
              name: key,
              check: action.schema[key],
              align: 'RIGHT'
            }];
          }
          else
          {
            json[`args${count}`] = [
            {
              type: 'field_dropdown',
              name: key,
              check: 'String',
              options: action.schema[key].map((value) => [ value, value ])
            }];
          }
          json[`message${count}`] = (json[`message${count}`] || '') + `${count === 0 ? ' with ' : ''}${key} %1`;
          count++;
        }
      }
      
      Blockly.Blocks[action.name] =
      {
        init: function()
        {
          this.jsonInit(json);
        }
      }
      Blockly.JavaScript[action.name] = function(block)
      {
        let args = [];
        for (let key in json)
        {
          if (key.indexOf('args') === 0)
          {
            const name = json[key][0].name;
            switch (json[key][0].type)
            {
              case 'input_value':
                const value = Blockly.JavaScript.valueToCode(block, name, Blockly.JavaScript.ORDER_NONE);
                if (value)
                {
                  args.push(`${name}: ${value}`);
                }
                break;
              case 'field_dropdown':
                args.push(`${name}: '${block.getFieldValue(name)}'`);
                break;
              default:
                break;
            }
          }
        }
        const code = `await App.call('${action.name}, {${args.join(', ')}});\n`;
        return code;
      }

      actionBlocks.push(`<block type="${action.name}"></block>`);
    });
    const idx = TOOLBOX.indexOf('<category name="Actions">');
    if (idx !== -1)
    {
      TOOLBOX[idx + 1] = actionBlocks.join();
    }
    WORKSPACE.updateToolbox(TOOLBOX.join());
  }

  function buildEventBlocks(events)
  {
    const eventBlocks = [];
    events.forEach((event) => {

      Blockly.Blocks[event.name] =
      {
        init: function()
        {
          this.jsonInit(
          {
            message0: `value %1 of ${event.friendlyName ? event.friendlyName : event.name}`,
            args0:
            [
              {
                type: 'field_dropdown',
                name: 'PROPERTY',
                options: Object.keys(event.schema).map((key) => [ key, key ])
              }
            ],
            output: null,
            colour: 120
          });
        }
      };
      Blockly.JavaScript[event.name] = function(block)
      {
        const property = block.getFieldValue('PROPERTY');
        const code = `App.get('${event.name}', '${property}')`;
        Blockly.JavaScript._topics[event.name] = true;
        return [ code, Blockly.JavaScript.ORDER_ADDITION ];
      }
      eventBlocks.push(`<block type="${event.name}"></block>`);

    });

    const idx = TOOLBOX.indexOf('<category name="Events">');
    if (idx !== -1)
    {
      TOOLBOX[idx + 1] = eventBlocks.join();
    }
    WORKSPACE.updateToolbox(TOOLBOX.join());
  }

  function sort(arr)
  {
    arr.sort((a, b) => {
      return a.name > b.name;
    });
    return arr;
  }

  const LIST = NODE.proxy({ service: '/list' });

  function rebuildEventAndActionBlocks()
  {
    LIST({}).then((list) => {
      buildEventBlocks(sort(list.topics.filter((topic) => topic.schema )));
      buildActionBlocks(sort(list.services.filter((service) => !service.name.endsWith('/config') && service.schema )));
    });
  }

  LIST({}).then((list) => {
    buildProgramBlocks();
    buildConfigBlocks(sort(list.services.filter((service) => service.name.endsWith('/config') && service.schema )));
    buildEventBlocks(sort(list.topics.filter((topic) => topic.schema )));
    buildActionBlocks(sort(list.services.filter((service) => !service.name.endsWith('/config') && service.schema )));
  });
 });
 