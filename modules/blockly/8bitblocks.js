function buildProgramBlocks()
{
  const json0 =
  {
    message0: 'Setup',
    message1: 'do %1',
    args1:
    [
      {
        type: 'input_statement',
        name: 'begin'
      }
    ], 
    message2: 'then loop',
    message3: 'do %1',
    args3:
    [
      {
        type: 'input_statement',
        name: 'loop'
      }
    ],
    colour: 120
  };

  Blockly.Blocks['main_program'] =
  {
    init: function()
    {
      this.jsonInit(json0);
    }
  }

  const json1 =
  {
    message0: 'Wait for events',
    previousStatement: null,
    nextStatement: null,
    colour: 120
  };

  Blockly.Blocks['wait_for_events'] =
  {
    init: function()
    {
      this.jsonInit(json1);
    }
  }

  const idx = TOOLBOX.indexOf('<category name="Program">');
  if (idx !== -1)
  {
    TOOLBOX[idx + 1] = `
      <block type="main_program"></block>
      <block type="wait_for_events"></block>
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
    
    let json =
    {
      message0: `Configure ${name.substr(0, name.length - 7)}`,
      previousStatement: null,
      nextStatement: null,
      colour: 90
    };
    let count = 1;
    for (let key in schema)
    {
      if (key !== '__return')
      {
        json[`args${count}`]= [
        {
          type: 'input_value',
          name: key,
          check: schema[key],
          align: 'RIGHT'
        }];
        json[`message${count}`] = `${key} %1`;
        count++;
      }
    }
    
    Blockly.Blocks[name] =
    {
      init: function()
      {
        this.jsonInit(json);
      }
    }

    NODE.proxy({ service: name })({}).then((config) => {
      NODE.unproxy({ service: name });
      let values = [];
      for (let ckey in config)
      {
        if (typeof config[ckey] === 'string')
        {
          values.push(`
            <value name="${ckey}">
              <block type="text">
                <field name="TEXT">${config[ckey]}</field>
              </block>
            </value>`);
        }
        else if (typeof config[ckey] === 'number')
        {
          values.push(`
            <value name="${ckey}">
              <block type="math_number">
                <field name="NUM">${config[ckey]}</field>
              </block>
            </value>`);
        }
      }
      configureBlocks.push(`<block type="${name}">${values.join()}</block>`);

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
          message0: `%1 of ${event.name}`,
          args0:
          [
            {
              type: 'field_dropdown',
              name: 'property',
              options: Object.keys(event.schema).map((key) => [ key, key ])
            }
          ],
          output: null,
          colour: 120
        });
      }
    };
    eventBlocks.push(`<block type="${event.name}"></block>`);
  });

  const idx = TOOLBOX.indexOf('<category name="Events">');
  if (idx !== -1)
  {
    TOOLBOX[idx + 1] = eventBlocks.join();
  }
  WORKSPACE.updateToolbox(TOOLBOX.join());
}

const LIST = NODE.proxy({ service: '/list' });
LIST({}).then((list) => {
  NODE.unproxy({ service: '/list' });
  buildProgramBlocks();
  buildConfigBlocks(list.services.filter((service) => service.name.endsWith('/config') && service.schema ));
  buildEventBlocks(list.topics.filter((topic) => topic.schema ));
  buildActionBlocks(list.services.filter((service) => !service.name.endsWith('/config') && service.schema ));
});
