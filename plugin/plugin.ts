creator.ui.show();

interface Message {
  type: string;
}

creator.ui.onMessage((msg: Message) => {
  switch (msg.type) {
    case "get-selected-node": {
      const layer = creator.selection;
      const scene = creator.activeScene;

      creator.ui.postMessage({
        type: "get-selected-node",
        message: { layer, scene },
      });
      break;
    }
  }
});
