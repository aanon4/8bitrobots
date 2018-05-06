document.addEventListener('DOMContentLoaded', function()
{
  function deploy(workspace)
  {
    const workspaceText = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));

    Blockly.JavaScript.INFINITE_LOOP_TRAP = 'if (App.hasTerminated()) throw new Error("Terminated");\n';
    Blockly.JavaScript._topics = {};

    // Monkey-patch: we only want the activity and config blocks as roots for the code.
    const _getTopBlocks = workspace.getTopBlocks;
    workspace.getTopBlocks = function(ordered)
    {
      return _getTopBlocks.call(workspace, ordered).filter((block) => {
        return block.type == 'activity' || block.type.endsWith('/config');
      });
    }
    const code = Blockly.JavaScript.workspaceToCode(workspace);
    workspace.getTopBlocks = _getTopBlocks;
  
    const ecode = Object.keys(Blockly.JavaScript._topics).map((topic) => {
      return `App.subscribeToTopic('${topic}');`;
    }).join('');
    const jscode = `${code};${ecode};App.run();`;

    console.log(jscode);
  
    /*const CONFIG = NODE.proxy({ service: '/app/config' });
    CONFIG({ source: workspaceText, code: jscode }).then(() => {
      NODE.unproxy({ service: '/app/config' });
    });*/
  }

  window.deployRobotWorkspace = deploy;
});
