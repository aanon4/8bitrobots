document.addEventListener('DOMContentLoaded', function()
{
  function deploy(workspace)
  {
    const workspaceText = Block.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));

    Blockly.JavaScript.INFINITE_LOOP_TRAP = 'if (App.hasTerminated()) { throw new Error("Terminated"); }';
    const jscode = Blockly.JavaScript.workspaceToCode(workspace);
  
    const CONFIG = NODE.proxy({ service: '/app/config' });
    CONFIG({ source: workspaceText, code: jscode }).then(() => {
      NODE.unproxy({ service: '/app/config' });
    });
  }

  window.deployRobotWorkspace = deploy;
});
