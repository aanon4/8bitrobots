document.addEventListener('DOMContentLoaded', function()
{
  const parts = [];
  
  Blockly.Blocks['ServoTrim'] =
  {
    init: function()
    {
      this.jsonInit(
      {
        message0: `constrain angle %1 with trim %2 clockwise %3 and counter-clockwise %4`,
        args0:
        [
          {
            type: 'input_value',
            name: 'angle'
          },
          {
            type: 'field_number',
            name: 'trim',
            value: 0
          },
          {
            type: 'field_number',
            name: 'cw',
            value: 0
          },
          {
            type: 'field_number',
            name: 'ccw',
            value: 0
          }
        ],
        output: null,
        inputsInline: true,
      });
    }
  };
  parts.push(`<block type="ServoTrim"></block>`);

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
            name: 'angle'
          }
        ],
        output: null,
        inputsInline: true,
      });
    }
  };
  parts.push(`<block type="Servo"></block>`);

  Blockly.Blocks['Motor'] =
  {
    init: function()
    {
      this.jsonInit(
      {
        message0: `convert RPM %1 to pulse with %2 max RPM`,
        args0:
        [
          {
            type: 'input_value',
            name: 'rpm'
          },
          {
            type: 'field_number',
            name: 'maxRpm',
            value: 100
          }
        ],
        output: null,
        inputsInline: true,
      });
    }
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
            name: 'x'
          },
          {
            type: 'input_value',
            name: 'y'
          },
          {
            type: 'field_dropdown',
            name: 'wheel',
            options: [ [ 'left velocity', 'left' ], [ 'right velocity', 'right' ] ]
          }
        ],
        output: null,
        inputsInline: true,
      });
    }
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
            name: 'x'
          },
          {
            type: 'input_value',
            name: 'y'
          },
          {
            type: 'field_dropdown',
            name: 'wheel',
            options: [ [ 'velocity', 'velocity' ], [ 'steering angle', 'steering' ] ]
          }
        ],
        output: null,
        inputsInline: true,
      });
    }
  };
  parts.push(`<block type="Car"></block>`);

  const idx = TOOLBOX.indexOf('<category name="Parts">');
  if (idx !== -1)
  {
    TOOLBOX[idx + 1] = parts.join();
  }
  WORKSPACE.updateToolbox(TOOLBOX.join());

});
