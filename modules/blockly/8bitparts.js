document.addEventListener('DOMContentLoaded', function()
{
  const parts = [];
  
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
            value: 0
          },
          {
            type: 'field_number',
            name: 'MAX',
            value: 0
          }
        ],
        output: null,
        inputsInline: true,
      });
    }
  };
  Blockly.JavaScript['Constrain'] = function(block)
  {
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ADDITION) || 0;
    const deadband = block.getFieldValue('DEADBAND');
    const min = block.getFieldValue('MIN');
    const max = block.getFieldValue('MAX');
    const code = `Math.max(Math.min(Math.abs(${value}) < ${deadband} ? 0 : ${value}, ${max}), ${min})`;
    return [ code, Blockly.JavaScript.ORDER_ADDITION ];
  };
  parts.push(`<block type="Constrain"></block>`);

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
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ADDITION) || 0;
    const code = `(1.5 + (${value}) / ${90 * 0.5})`;
    return [ code, Blockly.JavaScript.ORDER_ADDITION ];
  };
  parts.push(`<block type="Servo"></block>`);

  Blockly.Blocks['Motor'] =
  {
    init: function()
    {
      this.jsonInit(
      {
        message0: `convert motor RPM %1 to pulse with %2 max RPM`,
        args0:
        [
          {
            type: 'input_value',
            name: 'VALUE'
          },
          {
            type: 'field_number',
            name: 'MAX_RPM',
            value: 100
          }
        ],
        output: null,
        inputsInline: true,
      });
    }
  };
  Blockly.JavaScript['Motor'] = function(block)
  {
    const value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ADDITION) || 0;
    const maxRpm = block.getFieldValue('MAX_RPM');
    const code = `(1.5 + (${value}) / ${maxRpm} * 0.5)`;
    return [ code, Blockly.JavaScript.ORDER_ADDITION ];
  };
  parts.push(`<block type="Motor"></block>`);

  Blockly.Blocks['Tank'] =
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
  Blockly.JavaScript['Tank'] = function(block)
  {
    const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ADDITION) || 0;
    const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ADDITION) || 0;
    const output = block.getFieldValue('OUTPUT');
    const code = `App.part('Tank', { x: ${x}, y: ${y}, output: '${output}' })`
    return [ code, Blockly.JavaScript.ORDER_ADDITION ];
  };
  parts.push(`<block type="Tank"></block>`);


  Blockly.Blocks['Car'] =
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
  Blockly.JavaScript['Car'] = function(block)
  {
    const x = Blockly.JavaScript.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ADDITION) || 0;
    const y = Blockly.JavaScript.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ADDITION) || 0;
    const output = block.getFieldValue('OUTPUT');
    const code = `App.part('Car', { x: ${x}, y: ${y}, output: '${output}' })`
    return [ code, Blockly.JavaScript.ORDER_ADDITION ];
  };
  parts.push(`<block type="Car"></block>`);

  const idx = TOOLBOX.indexOf('<category name="Parts">');
  if (idx !== -1)
  {
    TOOLBOX[idx + 1] = parts.join();
  }
  WORKSPACE.updateToolbox(TOOLBOX.join());

});
