document.addEventListener('DOMContentLoaded', function()
{
  // --------------------------------------------------------------------------
  // Utility functions
  // --------------------------------------------------------------------------
  const UUID = function()
  {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };

  function sort(arr)
  {
    arr.sort((a, b) => {
      return a.name > b.name;
    });
    return arr;
  }

  function filter(item)
  {
    const f =
    {
      '/app/config': true,
      '/list': true,
      '/server/add_page': true,
      '/networking/config': true
    };
    return !f[item];
  }
  

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  let myBlocks = {};
  window.MYBLOCKS = myBlocks;
  window.APP = {};
  Blockly.Field.prototype.maxDisplayLength = 100;
  // Override the default text_print.
  Blockly.JavaScript['text_print'] = function(block)
  {
    const msg = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_NONE) || "''";
    return `App.print(${msg});\n`;
  };
  

  // --------------------------------------------------------------------------
  // Program Blocks
  // --------------------------------------------------------------------------
  function buildProgramBlocks()
  {
    Blockly.Blocks['setup'] =
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
          colour: 120
        });
      }
    };
    Blockly.JavaScript['setup'] = function(block)
    {
      Blockly.JavaScript._currentActivity = '';
      const code = Blockly.JavaScript.statementToCode(block, 'SETUP');
      if (code)
      {
        return `App.registerSetup(async function()
        {
          try
          {
            ${code}
          }
          catch (e)
          {
            App.print(e);
          }
        });\n`;
      }
      else
      {
        return '';
      }
    };
    myBlocks['setup'] = { category: 'Program', enabled: true, blocks:[] };
  
    Blockly.Blocks['activity'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: 'On activity',
          message1: 'do %1',
          args1:
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
      Blockly.JavaScript._currentActivity = UUID();
      Blockly.JavaScript._topics[Blockly.JavaScript._currentActivity] = {};
      Blockly.JavaScript.INFINITE_LOOP_TRAP = `if (!App.live('${Blockly.JavaScript._currentActivity}')) throw new Error("Terminated");\n`;
      const code = Blockly.JavaScript.statementToCode(block, 'ACTIVITY');
      if (code)
      {
        return `App.registerActivity('${Blockly.JavaScript._currentActivity}', async function()
        {
          try
          {
            while (await App.sync('${Blockly.JavaScript._currentActivity}'))
            {
              ${code}
            }
          }
          catch (e)
          {
            App.print(e);
          }
        });\n`;
      }
      else
      {
        return '';
      }
    };
    myBlocks['activity'] = { category: 'Program', enabled: true, blocks:[] };
  }

  // --------------------------------------------------------------------------
  // Config blocks
  // --------------------------------------------------------------------------
  function buildConfigBlocks(services)
  {
    for (let key in myBlocks)
    {
      if (myBlocks[key].category === 'Config')
      {
        myBlocks[key].enabled = false;
      }
    }

    return new Promise((resolve) => {
      let blocks = services.length;
      services.forEach((service) => {

        const name = service.name;
        const schema = service.schema;
        const config = {};

        const CONFIG = NODE.proxy({ service: name });
        CONFIG({}).then((newConfig) => {
          Object.assign(config, newConfig);
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
      
          let changes = false;
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
                case Blockly.Events.BLOCK_CREATE:
                {
                  const block = WORKSPACE.getBlockById(e.blockId);
                  if (block.type === name)
                  {
                    for (let key in config)
                    {
                      block.setFieldValue(config[key], key);
                    }
                  }
                  break;
                }
                case Blockly.Events.BLOCK_CHANGE:
                  if (this.id === e.blockId)
                  {
                    config[e.name] = e.newValue;
                    changes = true;
                  }
                  break;
                case Blockly.Events.UI:
                  if (changes)
                  {
                    CONFIG(config).then((newConfig) => {
                      changes = false;
                      Object.assign(config, newConfig);
                      rebuildEventAndActionBlocks();
                    });
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
              return App.call('${name}', ${JSON.stringify(config)});
            });\n`;

            return code;
          };

          if (!myBlocks[name])
          {
            myBlocks[name] = { category: 'Config', blocks: [] };
          }
          myBlocks[name].enabled = true;

          if (--blocks === 0)
          {
            resolve();
          }
        });
      });
    });
  }

  // --------------------------------------------------------------------------
  // Action blocks
  // --------------------------------------------------------------------------
  function buildActionBlocks(actions)
  {
    for (let key in myBlocks)
    {
      if (myBlocks[key].category === 'Action')
      {
        myBlocks[key].enabled = false;
      }
    }

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
        const code = `await App.call('${action.name}', {${args.join(', ')}});\n`;
        return code;
      }

      if (!myBlocks[action.name])
      {
        myBlocks[action.name] = { category: 'Action', friendlyName: action.friendlyName, blocks: [] };
      }
      myBlocks[action.name].enabled = true;
      // If the friendly name changes, we disable and disassociate any associated blocks
      if (myBlocks[action.name].friendlyName !== action.friendlyName)
      {
        myBlocks[action.name].blocks.forEach((blockId) => {
          WORKSPACE.getBlockById(blockId).dispose(false);
        });
        myBlocks[action.name].blocks = [];
      }
    });

    // Disable and disassociate any action blocks we no longer support.
    for (let key in myBlocks)
    {
      if (!myBlocks[key].enabled && myBlocks[key].category === 'Action')
      {
        myBlocks[key].blocks.forEach((blockId) => {
          WORKSPACE.getBlockById(blockId).dispose(false);
        });
        myBlocks[key].blocks = [];
      }
    }
  }

  // --------------------------------------------------------------------------
  // Event blocks
  // --------------------------------------------------------------------------
  function buildEventBlocks(events)
  {
    for (let key in myBlocks)
    {
      if (myBlocks[key].category === 'Event')
      {
        myBlocks[key].enabled = false;
      }
    }

    events.forEach((event) => {

      Blockly.Blocks[event.name] =
      {
        init: function()
        {
          this.jsonInit(
          {
            message0: `${event.friendlyName ? event.friendlyName : event.name} value %1`,
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
        const code = `App.get('${Blockly.JavaScript._currentActivity}', '${event.name}', '${property}')`;
        if (Blockly.JavaScript._currentActivity)
        {
          const topics = Blockly.JavaScript._topics[Blockly.JavaScript._currentActivity];
          if (!topics[event.name])
          {
            topics[event.name] = { active: true, heartbeat: 0 };
          }
        }
        return [ code, Blockly.JavaScript.ORDER_ADDITION ];
      }

      if (!myBlocks[event.name])
      {
        myBlocks[event.name] = { category: 'Event', friendlyName: event.friendlyName, blocks: [] };
      }
      myBlocks[event.name].enabled = true;
      // If the friendly name changes, we disable and disassociate any associated blocks
      if (myBlocks[event.name].friendlyName !== event.friendlyName)
      {
        myBlocks[event.name].blocks.forEach((blockId) => {
          WORKSPACE.getBlockById(blockId).dispose(false);
        });
        myBlocks[event.name].blocks = [];
      }
    });


    // Heartbeat event block
    const heartevents = Object.keys(myBlocks).filter((name) => {
      return myBlocks[name].category === 'Event';
    });
    Blockly.Blocks['heatbeat'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: `heartbeat of %1 is greater than %2 seconds`,
          args0:
          [
            {
              type: 'field_dropdown',
              name: 'EVENT_NAME',
              options: heartevents.map((name) => [ myBlocks[name].friendlyName || name, name ])
            },
            {
              type: 'field_number',
              name: 'LIMIT',
              value: 5
            }
          ],
          output: null,
          colour: 120
        });
      }
    };
    Blockly.JavaScript['heatbeat'] = function(block)
    {
      const eventName = block.getFieldValue('EVENT_NAME');
      const limit = block.getFieldValue('LIMIT');
      const code = `App.get('${Blockly.JavaScript._currentActivity}', '${eventName}', '__heartbeat') > ${limit}`;
      if (Blockly.JavaScript._currentActivity)
      {
        const topics = Blockly.JavaScript._topics[Blockly.JavaScript._currentActivity];
        if (!topics[eventName])
        {
          topics[eventName] = { active: true, heartbeat: limit };
        }
        else if (limit < topics[eventName].heartbeat)
        {
          topics[eventName].heartbeat = limit;
        }
      }
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    }
    myBlocks['heatbeat'] = { category: 'Event', enabled: true, blocks: [] };

    // Disable and disassociate any event blocks we no longer support.
    for (let key in myBlocks)
    {
      if (!myBlocks[key].enabled && myBlocks[key].category === 'Event')
      {
        myBlocks[key].blocks.forEach((blockId) => {
          WORKSPACE.getBlockById(blockId).dispose(false);
        });
        myBlocks[key].blocks = [];
      }
    }
  }

  // --------------------------------------------------------------------------
  // Part blocks
  // --------------------------------------------------------------------------
  function buildPartBlocks()
  {
    for (let key in myBlocks)
    {
      if (myBlocks[key].category === 'Part')
      {
        myBlocks[key].enabled = false;
      }
    }
    
    Blockly.Blocks['Constrain'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: `constrain %1 with deadband %2 low %3 and high %4`,
          args0:
          [
            {
              type: 'input_value',
              name: 'VALUE'
            },
            {
              type: 'field_number',
              name: 'DEADBAND',
              value: 0
            },
            {
              type: 'field_number',
              name: 'MIN',
              value: -1
            },
            {
              type: 'field_number',
              name: 'MAX',
              value: 1
            }
          ],
          output: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['Constrain'] = function(block)
    {
      const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_NONE) || 0;
      const deadband = block.getFieldValue('DEADBAND');
      const min = block.getFieldValue('MIN');
      const max = block.getFieldValue('MAX');
      const code = `(${value} > ${deadband} ? Math.min(${max}, ${value} - ${deadband}) : ${value} < -${deadband} ? Math.max(${min}, ${value} + ${deadband}) ? 0)`;
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    myBlocks['Constrain'] = { category: 'Part', enabled: true, blocks: [] };

    Blockly.Blocks['Servo'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: `convert servo angle %1 to pulse`,
          args0:
          [
            {
              type: 'input_value',
              name: 'VALUE'
            }
          ],
          output: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['Servo'] = function(block)
    {
      const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_NONE) || 0;
      const code = `(1.5 + (${value}) / ${90 * 0.5})`;
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    myBlocks['Servo'] = { category: 'Part', enabled: true, blocks: [] };

    Blockly.Blocks['Motor'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: `convert motor velocity %1 to pulse`,
          args0:
          [
            {
              type: 'input_value',
              name: 'VALUE'
            }
          ],
          output: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['Motor'] = function(block)
    {
      const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_NONE) || 0;
      const code = `(1.5 + (${value}) * 0.5)`;
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    myBlocks['Motor'] = { category: 'Part', enabled: true, blocks: [] };

    Blockly.Blocks['tank'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: `convert x %1 y %2 to tank %3`,
          args0:
          [
            {
              type: 'input_value',
              name: 'X'
            },
            {
              type: 'input_value',
              name: 'Y'
            },
            {
              type: 'field_dropdown',
              name: 'OUTPUT',
              options: [ [ 'left velocity', 'left' ], [ 'right velocity', 'right' ] ]
            }
          ],
          output: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['tank'] = function(block)
    {
      const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_NONE) || 0;
      const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_NONE) || 0;
      const output = block.getFieldValue('OUTPUT');
      const code = `App.part('tank', { x: ${x}, y: ${y}, output: '${output}' })`
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    myBlocks['tank'] = { category: 'Part', enabled: true, blocks: [] };

    Blockly.Blocks['car'] =
    {
      init: function()
      {
        this.jsonInit(
        {
          message0: `convert x %1 y %2 to car %3`,
          args0:
          [
            {
              type: 'input_value',
              name: 'X'
            },
            {
              type: 'input_value',
              name: 'Y'
            },
            {
              type: 'field_dropdown',
              name: 'OUTPUT',
              options: [ [ 'velocity', 'velocity' ], [ 'steering angle', 'steering' ] ]
            }
          ],
          output: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['car'] = function(block)
    {
      const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_NONE) || 0;
      const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_NONE) || 0;
      const output = block.getFieldValue('OUTPUT');
      const code = `App.part('car', { x: ${x}, y: ${y}, output: '${output}' })`
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    myBlocks['car'] = { category: 'Part', enabled: true, blocks: [] };
  }

  function generateToolbox()
  {
    const categories = {};
    for (let key in myBlocks)
    {
      const block = myBlocks[key];
      if (!categories[block.category])
      {
        categories[block.category] = [];
      }
      if (block.category === 'Config' && block.blocks.length)
      {
        // Dont include config blocks in toolbox if we already have one in the program.
      }
      else if (block.enabled)
      {
        categories[block.category].push(`<block type="${key}"></block>`);
      }
    }
    for (let key in categories)
    {
      const idx = TOOLBOX.indexOf(`<category name="${key}">`);
      if (idx !== -1)
      {
        TOOLBOX[idx + 1] = categories[key].join();
      }
    }
    WORKSPACE.updateToolbox(TOOLBOX.join());
  }

  // --------------------------------------------------------------------------
  // Manage workspace state
  // --------------------------------------------------------------------------

  WORKSPACE.addChangeListener(function(event)
  {
    switch (event.type)
    {
      case Blockly.Events.BLOCK_CREATE:
      {
        let rebuildToolbox = false;
        WORKSPACE.getBlockById(event.blockId).getDescendants().forEach((block) => {
          if (block.type in myBlocks)
          {
            myBlocks[block.type].blocks.push(block.id);
            if (myBlocks[block.type].category === 'Config')
            {
              rebuildToolbox = true;
            }
          }
        });
        if (rebuildToolbox)
        {
          generateToolbox();
        }
        break;
      }
      case Blockly.Events.BLOCK_DELETE:
      {
        let rebuildToolbox = false;
        event.ids.forEach((id) => {
          for (let type in myBlocks)
          {
            const idx = myBlocks[type].blocks.indexOf(id);
            if (idx !== -1)
            {
              myBlocks[type].blocks.splice(idx, 1);
              if (myBlocks[type].category === 'Config')
              {
                rebuildToolbox = true;
              }
              break;
            }
          }
        });
        if (rebuildToolbox)
        {
          generateToolbox();
        }
        break;
      }
      default:
        break;
    }
  });

  // --------------------------------------------------------------------------
  // API to app container
  // --------------------------------------------------------------------------

  APP.deployRobotWorkspace = function(workspace)
  {
    const workspaceText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));

    Blockly.JavaScript._currentActivity = '';
    Blockly.JavaScript._topics = {};

    // Monkey-patch: we only want the activity and config blocks as roots for the code.
    const _getTopBlocks = workspace.getTopBlocks;
    workspace.getTopBlocks = function(ordered)
    {
      return _getTopBlocks.call(workspace, ordered).filter((block) => {
        return block.type === 'setup' || block.type === 'activity' || block.type.endsWith('/config');
      });
    }
    const code = Blockly.JavaScript.workspaceToCode(workspace);
    workspace.getTopBlocks = _getTopBlocks;
  
    const ecode = Object.keys(Blockly.JavaScript._topics).map((activity) => {
      return Object.keys(Blockly.JavaScript._topics[activity]).map((topic) => {
        return `App.subscribe('${activity}', '${topic}', ${Blockly.JavaScript._topics[activity][topic].heartbeat * 1000});`;
      });
    }).join('');
    const jscode = code || ecode ? `${code};${ecode};App.run();` : '';

    //console.log(jscode);
  
    const CONFIG = NODE.proxy({ service: '/app/config' });
    CONFIG({ source: workspaceText, code: jscode }).then(() => {
      NODE.unproxy({ service: '/app/config' });
    });
  }

  function loadWorkspace(workspace)
  {
    const CONFIG = NODE.proxy({ service: '/app/config' });
    CONFIG({}).then((config) => {
      NODE.unproxy({ service: '/app/config' });
      if (config.source)
      {
        workspace.clear();
        for (let type in myBlocks)
        {
          myBlocks[type].blocks = [];
        }
        Blockly.Xml.appendDomToWorkspace(Blockly.Xml.textToDom(config.source), workspace);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Generate blocks
  // --------------------------------------------------------------------------

  const LIST = NODE.proxy({ service: '/list' });

  function rebuildEventAndActionBlocks()
  {
    LIST({}).then((list) => {
      Promise.all([
        buildEventBlocks(sort(list.topics.filter((topic) => filter(topic.name) && topic.schema ))),
        buildActionBlocks(sort(list.services.filter((service) => filter(service.name) && !service.name.endsWith('/config') && service.schema )))
      ]).then(() => {
        generateToolbox();
      });
    });
  }

  LIST({}).then((list) => {
    Promise.all([
      buildProgramBlocks(),
      buildConfigBlocks(sort(list.services.filter((service) => filter(service.name) && service.name.endsWith('/config') && service.schema ))),
      buildEventBlocks(sort(list.topics.filter((topic) => filter(topic.name) && topic.schema ))),
      buildActionBlocks(sort(list.services.filter((service) => filter(service.name) && !service.name.endsWith('/config') && service.schema ))),
      buildPartBlocks()
    ]).then(() => {
      generateToolbox();
      loadWorkspace(WORKSPACE);
    });
  });
 });
 