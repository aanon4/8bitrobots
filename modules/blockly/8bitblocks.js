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

  window.APP = {};
  Blockly.Field.prototype.maxDisplayLength = 100;
  Blockly.JavaScript.INFINITE_LOOP_TRAP = `if (activity.terminated()) throw new Error("Terminated");\n`;
  Blockly.JavaScript.addReservedWords('activity');
  // Override the default text_print.
  Blockly.JavaScript['text_print'] = function(block)
  {
    const msg = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_NONE) || "''";
    return `activity.print(${msg});\n`;
  };

  const COLOR =
  {
    PROGRAM: 190,
    CONFIG: 240,
    ACTION: 0,
    EVENT: 55,
    PART:
    {
      BUTTON_CSS_CLASS: 'part-create-button',
      CONFIG: 240,
      SET: 0,
      GET: 55
    }
  };

  const TransitionFunctions = [ [ 'linear', 'linear' ], [ 'ease_in', 'ease_in' ], [ 'ease_inout', 'ease_inout' ], [ 'ease_out', 'ease_out' ], [ 'idle', 'idle' ] ];

  // --------------------------------------------------------------------------
  // Program Blocks
  // --------------------------------------------------------------------------
  function buildProgramBlocks()
  {
    Blockly.Blocks['setup'] =
    {
      __category: 'Program',
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
          colour: COLOR.PROGRAM
        });
      }
    };
    Blockly.JavaScript['setup'] = function(block)
    {
      Blockly.JavaScript._currentActivity = '';
      const code = Blockly.JavaScript.statementToCode(block, 'SETUP');
      if (code)
      {
        return `App.registerSetup(async function(activity)
        {
          try
          {
            ${code}
          }
          catch (e)
          {
            activity.print(e);
          }
        });\n`;
      }
      else
      {
        return '';
      }
    };
  
    Blockly.Blocks['activity'] =
    {
      __category: 'Program',
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
          colour: COLOR.PROGRAM
        });
      }
    };
    Blockly.JavaScript['activity'] = function(block)
    {
      Blockly.JavaScript._currentActivity = UUID();
      Blockly.JavaScript._topics[Blockly.JavaScript._currentActivity] = {};
      const code = Blockly.JavaScript.statementToCode(block, 'ACTIVITY');
      if (code)
      {
        return `App.registerActivity('${Blockly.JavaScript._currentActivity}', async function(activity)
        {
          try
          {
            while (await activity.sync())
            {
              ${code}
            }
          }
          catch (e)
          {
            activity.print(e);
          }
        });\n`;
      }
      else
      {
        return '';
      }
    };
  }

  // --------------------------------------------------------------------------
  // Config blocks
  // --------------------------------------------------------------------------
  function buildConfigBlocks(services)
  {
    for (let name in Blockly.Blocks)
    {
      if (Blockly.Blocks[name].__category === 'Config')
      {
        delete Blockly.Blocks[name];
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
            colour: COLOR.CONFIG
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
            __category: 'Config',
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
                  if (block && block.type === name)
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
            const code = `App.registerConfiguration(function(activity)
            {
              return activity.service('${name}')(${JSON.stringify(config)});
            });\n`;

            return code;
          };

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
    for (let name in Blockly.Blocks)
    {
      if (Blockly.Blocks[name].__category === 'Action')
      {
        delete Blockly.Blocks[name];
      }
    }

    actions.forEach((action) => {
      
      let json =
      {
        message0: `Set ${action.friendlyName ? action.friendlyName : action.name}`,
        previousStatement: null,
        nextStatement: null,
        inputsInline: true,
        colour: COLOR.ACTION
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
        __category: 'Action',
        __friendlyName: action.friendlyName,
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
        const code = `await activity.service('${action.name}')({${args.join(', ')}});\n`;
        return code;
      }
    });
  }

  // --------------------------------------------------------------------------
  // Event blocks
  // --------------------------------------------------------------------------
  function buildEventBlocks(events)
  {
    for (let name in Blockly.Blocks)
    {
      if (Blockly.Blocks[name].__category === 'Event')
      {
        delete Blockly.Blocks[name];
      }
    }

    events.forEach((event) => {

      Blockly.Blocks[event.name] =
      {
        __category: 'Event',
        __friendlyName: event.friendlyName,
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
            colour: COLOR.EVENT
          });
        }
      };
      Blockly.JavaScript[event.name] = function(block)
      {
        const property = block.getFieldValue('PROPERTY');
        const code = `activity.get('${event.name}')['${property}']`;
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
    });

    // Heartbeat event block
    Blockly.Blocks['heatbeat'] =
    {
      __category: 'Event',
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
              options: events.map((event) => [ Blockly.Blocks[event.name].__friendlyName || event.name, event.name ])
            },
            {
              type: 'field_number',
              name: 'LIMIT',
              value: 5
            }
          ],
          output: null,
          colour: COLOR.EVENT
        });
      }
    };
    Blockly.JavaScript['heatbeat'] = function(block)
    {
      const eventName = block.getFieldValue('EVENT_NAME');
      const limit = block.getFieldValue('LIMIT');
      const code = `activity.get('${eventName}').__heartbeat > ${limit}`;
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
  }

  // --------------------------------------------------------------------------
  // Part blocks
  // --------------------------------------------------------------------------
  function buildParts()
  {
    const partTypes = [];
    
    function registerPart(type)
    {
      partTypes.push(type);
      WORKSPACE.registerButtonCallback(`CALLBACK_${type.name}`, (button) => {
        Blockly.Variables.createVariable(button.getTargetWorkspace(), (name) => {
          if (name)
          {
            buildParts();
          }
        }, type.name);
      });
    }

    WORKSPACE.registerToolboxCategoryCallback('Part', () => {
      const xml = [];
      partTypes.forEach((type) => {
        xml.push(Blockly.Xml.textToDom(`<button web-class="${COLOR.PART.BUTTON_CSS_CLASS}" text="Create ${type.name}..." callbackKey="CALLBACK_${type.name}"></button>`));
        const variables = WORKSPACE.getVariablesOfType(type.name);
        if (variables.length)
        {
          if (Blockly.Blocks[`${type.name}_SET`] && Blockly.Blocks[`${type.name}_GET`])
          {
            xml.push(Blockly.Xml.textToDom('<sep gap="8"></sep>'));
            xml.push(Blockly.Xml.textToDom(`<block type="${type.name}_SET"><field variabletype='${type.name}' name="NAME">${variables[0].name}</field></block>`));
            variables.forEach((variable) => {
              xml.push(Blockly.Xml.textToDom('<sep gap="8"></sep>'));
              xml.push(Blockly.Xml.textToDom(`<block type="${type.name}_GET"><field variabletype='${type.name}' name="NAME">${variable.name}</field></block>`));
            });
          }
          else if (Blockly.Blocks[`${type.name}_SET`])
          {
            variables.forEach((variable) => {
              xml.push(Blockly.Xml.textToDom('<sep gap="8"></sep>'));
              xml.push(Blockly.Xml.textToDom(`<block type="${type.name}_SET"><field variabletype='${type.name}' name="NAME">${variable.name}</field></block>`));
            });
          }
          else if (Blockly.Blocks[`${type.name}_GET`])
          {
            variables.forEach((variable) => {
              xml.push(Blockly.Xml.textToDom('<sep gap="8"></sep>'));
              xml.push(Blockly.Xml.textToDom(`<block type="${type.name}_GET"><field variabletype='${type.name}' name="NAME">${variable.name}</field></block>`));
            });
          }
        }
      });
      return xml;
    });

    // PWM Channels
    const channels = Object.keys(Blockly.Blocks).filter((key) => {
      return key.indexOf('/set_pulse') !== -1;
    }).map((key) => {
      return [ Blockly.Blocks[key].__friendlyName || key, key ];
    });

    // SERVO
    const servoVariables = WORKSPACE.getVariablesOfType('Servo');
    if (channels.length && servoVariables.length)
    {
      Blockly.Blocks['Servo_CONFIG'] =
      {
        __category: 'Config',
        __tool: `<block type="Servo_CONFIG"><field variabletype="Servo" name="NAME">${servoVariables[0].name}</field></block>`,
        init: function()
        {
          this.jsonInit(
          {
            colour: COLOR.PART.CONFIG,
            message0: 'Configure Servo',
            message1: 'name %1',
            args1:
            [
              {
                type: 'field_variable',
                name: 'NAME',
                defaultType: 'Servo',
                variableTypes: [ 'Servo' ]
              }
            ],
            message2: 'channel %1',
            args2:
            [
              {
                type: 'field_dropdown',
                name: 'CHANNEL',
                options: channels
              }
            ],
            message3: 'reverse %1',
            args3:
            [
              {
                type: 'field_checkbox',
                name: 'REV',
                value: false
              }
            ],
            message4: 'trim %1',
            args4:
            [
              {
                type: 'field_number',
                name: 'TRIM',
                value: 0
              }
            ],
            message5: 'min %1',
            args5:
            [
              {
                type: 'field_number',
                name: 'MIN',
                value: 0
              },
            ],
            message6: 'max %1',
            args6:
            [
              {
                type: 'field_number',
                name: 'MAX',
                value: 180
              }
            ]
          });
        }
      };
      Blockly.JavaScript['Servo_CONFIG'] = function(block)
      {
        const name = block.getFieldValue('NAME');
        const channel = block.getFieldValue('CHANNEL');
        const rev = block.getFieldValue('REV');
        const trim = block.getFieldValue('TRIM');
        const min = block.getFieldValue('MIN');
        const max = block.getFieldValue('MAX');
        const code = `App.registerConfiguration(function(activity)
        {
          return activity.part('Servo', '${name}')({ channel: '${channel}', rev: ${rev}, trim: ${trim}, min: ${min}, max: ${max} });
        });\n`;

        return code;
      };
    }
    else if (Blockly.Blocks['Servo_CONFIG'])
    {
      delete Blockly.Blocks['Servo_CONFIG'];
    }

    Blockly.Blocks['Servo_SET'] =
    {
      __category: 'Part',
      init: function()
      {
        this.jsonInit(
        {
          colour: COLOR.PART.SET,
          message0: 'for servo %1 set angle to %2 over %3 milliseconds with %4 transition',
          args0:
          [
            {
              type: 'field_variable',
              name: 'NAME',
              defaultType: 'Servo',
              variableTypes: [ 'Servo' ]
            },
            {
              type: 'input_value',
              name: 'ANGLE'
            },
            {
              type: 'input_value',
              name: 'TIME'
            },
            {
              type: 'field_dropdown',
              name: 'FUNC',
              options: TransitionFunctions
            }
          ],
          previousStatement: null,
          nextStatement: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['Servo_SET'] = function(block)
    {
      const name = block.getFieldValue('NAME');
      const angle = Blockly.JavaScript.valueToCode(block, 'ANGLE', Blockly.JavaScript.ORDER_NONE) || undefined;
      const time = Blockly.JavaScript.valueToCode(block, 'TIME', Blockly.JavaScript.ORDER_NONE) || 0;
      const func = block.getFieldValue('FUNC');
      const code = `activity.part('Servo', '${name}')({ angle: ${angle}, time: ${time}, func: '${func}' });`
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    registerPart({ name: 'Servo' });

    // CONTINUOUS SERVO
    const cservoVariables = WORKSPACE.getVariablesOfType('ContinuousServo');
    if (channels.length && cservoVariables.length)
    {
      Blockly.Blocks['ContinuousServo_CONFIG'] =
      {
        __category: 'Config',
        __tool: `<block type="ContinuousServo_CONFIG"><field variabletype="ContinuousServo" name="NAME">${cservoVariables[0].name}</field></block>`,
        init: function()
        {
          this.jsonInit(
          {
            colour: COLOR.PART.CONFIG,
            message0: 'Configure Continuous Servo',
            message1: 'name %1',
            args1:
            [
              {
                type: 'field_variable',
                name: 'NAME',
                defaultType: 'ContinuousServo',
                variableTypes: [ 'ContinuousServo' ]
              }
            ],
            message2: 'channel %1',
            args2:
            [
              {
                type: 'field_dropdown',
                name: 'CHANNEL',
                options: channels
              }
            ],
            message3: 'reverse %1',
            args3:
            [
              {
                type: 'field_checkbox',
                name: 'REV',
                value: false
              }
            ],
            message4: 'min %1',
            args4:
            [
              {
                type: 'field_number',
                name: 'MIN',
                value: -1
              },
            ],
            message5: 'max %1',
            args5:
            [
              {
                type: 'field_number',
                name: 'MAX',
                value: 1
              }
            ]
          });
        }
      };
      Blockly.JavaScript['ContinuousServo_CONFIG'] = function(block)
      {
        const name = block.getFieldValue('NAME');
        const channel = block.getFieldValue('CHANNEL');
        const rev = block.getFieldValue('REV');
        const min = block.getFieldValue('MIN');
        const max = block.getFieldValue('MAX');
        const code = `App.registerConfiguration(function(activity)
        {
          return activity.part('ContinuousServo', '${name}')({ channel: '${channel}', rev: ${rev}, min: ${min}, max: ${max} });
        });\n`;

        return code;
      };
    }
    else if (Blockly.Blocks['ContinuousServo_CONFIG'])
    {
      delete Blockly.Blocks['ContinuousServo_CONFIG'];
    }
    Blockly.Blocks['ContinuousServo_SET'] =
    {
      __category: 'Part',
      init: function()
      {
        this.jsonInit(
        {
          colour: COLOR.PART.SET,
          message0: 'for continuous servo %1 set velocity to %2 over %3 milliseconds with %4 transition',
          args0:
          [
            {
              type: 'field_variable',
              name: 'NAME',
              defaultType: 'ContinuousServo',
              variableTypes: [ 'ContinuousServo' ]
            },
            {
              type: 'input_value',
              name: 'VELOCITY'
            },
            {
              type: 'input_value',
              name: 'TIME'
            },
            {
              type: 'field_dropdown',
              name: 'FUNC',
              options: TransitionFunctions
            }
          ],
          previousStatement: null,
          nextStatement: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['ContinuousServo_SET'] = function(block)
    {
      const name = block.getFieldValue('NAME');
      const velocity = Blockly.JavaScript.valueToCode(block, 'VELOCITY', Blockly.JavaScript.ORDER_NONE) || undefined;
      const time = Blockly.JavaScript.valueToCode(block, 'TIME', Blockly.JavaScript.ORDER_NONE) || 0;
      const func = block.getFieldValue('FUNC');
      const code = `activity.part('ContinuousServo', '${name}')({ velocity: ${velocity}, time: ${time}, func: '${func}' });`
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    registerPart({ name: 'ContinuousServo' });

    // TANK
    Blockly.Blocks['Tank_SET'] =
    {
      __category: 'Part',
      init: function()
      {
        this.jsonInit(
        {
          colour: COLOR.PART.SET,
          message0: `for tank %1 set x %2 and y %3`,
          args0:
          [
            {
              type: 'field_variable',
              name: 'NAME',
              defaultType: 'Tank',
              variableTypes: [ 'Tank' ]
            },
            {
              type: 'input_value',
              name: 'X'
            },
            {
              type: 'input_value',
              name: 'Y'
            }
          ],
          previousStatement: null,
          nextStatement: null,
          inputsInline: true,
        });
      }
    };
    Blockly.Blocks['Tank_GET'] =
    {
      __category: 'Part',
      init: function()
      {
        this.jsonInit(
        {
          color: COLOR.PART.GET,
          message0: `for tank set %1 get %2`,
          args0:
          [
            {
              type: 'field_variable',
              name: 'NAME',
              defaultType: 'Tank',
              variableTypes: [ 'Tank' ]
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
    Blockly.JavaScript['Tank_SET'] = function(block)
    {
      const name = block.getFieldValue('NAME');
      const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_NONE) || undefined;
      const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_NONE) || undefined;
      const code = `activity.part('Tank', '${name}')({ x: ${x}, y: ${y} });`;
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    Blockly.JavaScript['Tank_GET'] = function(block)
    {
      const name = block.getFieldValue('NAME');
      const output = block.getFieldValue('OUTPUT');
      const code = `activity.part('Tank', '${name}')({}).${output}`;
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    registerPart({ name: 'Tank' });

    // CAR
    Blockly.Blocks['Car_SET'] =
    {
      __category: 'Part',
      init: function()
      {
        this.jsonInit(
        {
          colour: COLOR.PART.SET,
          message0: `for car %1 set x %2 and y %3`,
          args0:
          [
            {
              type: 'field_variable',
              name: 'NAME',
              defaultType: 'Car',
              variableTypes: [ 'Car' ]
            },
            {
              type: 'input_value',
              name: 'X'
            },
            {
              type: 'input_value',
              name: 'Y'
            }
          ],
          previousStatement: null,
          nextStatement: null,
          inputsInline: true,
        });
      }
    };
    Blockly.Blocks['Car_GET'] =
    {
      __category: 'Part',
      init: function()
      {
        this.jsonInit(
        {
          colour: COLOR.PART.GET,
          message0: `for car %1 get %2`,
          args0:
          [
            {
              type: 'field_variable',
              name: 'NAME',
              defaultType: 'Car',
              variableTypes: [ 'Car' ]
            },
            {
              type: 'field_dropdown',
              name: 'OUTPUT',
              options: [ [ 'velocity', 'velocity' ], [ 'steering angle', 'angle' ] ]
            }
          ],
          output: null,
          inputsInline: true,
        });
      }
    };
    Blockly.JavaScript['Car_SET'] = function(block)
    {
      const name = block.getFieldValue('NAME');
      const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_NONE) || undefined;
      const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_NONE) || undefined;
      const code = `activity.part('Car', '${name}')({ x: ${x}, y: ${y} });`;
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    Blockly.JavaScript['Car_GET'] = function(block)
    {
      const name = block.getFieldValue('NAME');
      const output = block.getFieldValue('OUTPUT');
      const code = `activity.part('Car', '${name}')({}).${output}`;
      return [ code, Blockly.JavaScript.ORDER_NONE ];
    };
    registerPart({ name: 'Car' });
  }

  // --------------------------------------------------------------------------
  // Toolbox
  // --------------------------------------------------------------------------

  function registerToolboxCategory(category)
  {
    WORKSPACE.registerToolboxCategoryCallback(category, () => {
      const xml = [];
      for (let name in Blockly.Blocks)
      {
        if (Blockly.Blocks[name].__category === category)
        {
          xml.push(Blockly.Xml.textToDom(Blockly.Blocks[name].__tool || `<block type="${name}"></block>`));
          xml.push(Blockly.Xml.textToDom('<sep gap="12"></sep>'));
        }
      }
      return xml;
    });
  }
  registerToolboxCategory('Program');
  registerToolboxCategory('Config');
  registerToolboxCategory('Action');
  registerToolboxCategory('Event');


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

  function workspaceLoad()
  {
    const CONFIG = NODE.proxy({ service: '/app/config' });
    CONFIG({}).then((config) => {
      NODE.unproxy({ service: '/app/config' });
      if (config.source)
      {
        WORKSPACE.clear();
        Blockly.Xml.appendDomToWorkspace(Blockly.Xml.textToDom(config.source), WORKSPACE);
      }
    });
  }

  function workspaceRefresh()
  {
    const workspaceDom = Blockly.Xml.textToDom(Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(WORKSPACE)));
    WORKSPACE.clear();
    Blockly.Xml.appendDomToWorkspace(workspaceDom, WORKSPACE);
  }

  WORKSPACE.addChangeListener((e) => {
    switch (e.type)
    {
      case Blockly.Events.VAR_DELETE:
        buildParts();
        break;
      default:
        break;
    }
  });

  // --------------------------------------------------------------------------
  // Generate blocks
  // --------------------------------------------------------------------------

  const LIST = NODE.proxy({ service: '/list' });

  function rebuildEventAndActionBlocks()
  {
    LIST({}).then((list) => {
      return Promise.all([
        buildEventBlocks(sort(list.topics.filter((topic) => filter(topic.name) && topic.schema ))),
        buildActionBlocks(sort(list.services.filter((service) => filter(service.name) && !service.name.endsWith('/config') && service.schema )))
      ]);
    }).then(() => {
      buildParts();
      // Delete any blocks which no longer have any associated info.
      WORKSPACE.getAllBlocks().forEach((block) => {
        if (!Blockly.Blocks[block.type])
        {
          block.dispose(false);
        }
      });
      workspaceRefresh();
    });
  }

  LIST({}).then((list) => {
    return Promise.all([
      buildProgramBlocks(),
      buildConfigBlocks(sort(list.services.filter((service) => filter(service.name) && service.name.endsWith('/config') && service.schema ))),
      buildEventBlocks(sort(list.topics.filter((topic) => filter(topic.name) && topic.schema ))),
      buildActionBlocks(sort(list.services.filter((service) => filter(service.name) && !service.name.endsWith('/config') && service.schema ))),
    ]);
  }).then(() => {
    buildParts();
    workspaceLoad();
  });

});
 