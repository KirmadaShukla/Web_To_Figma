figma.showUI(__html__, { width: 300, height: 200 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'createPrototype') {
    const data = msg.data;

    const frame = figma.createFrame();
    frame.name = "AI-Generated Web Prototype";
    frame.resize(800, 600);
    frame.backgrounds = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

    let yOffset = 20;
    let maxWidth = 800;

    for (const item of data) {
      try {
        if (item.category === 'title') {
          const text = figma.createText();
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          text.characters = item.text || '[No text]';
          text.fontSize = item.type === 'h1' ? 32 : 24;
          text.x = 20;
          text.y = yOffset;
          frame.appendChild(text);
          if (text.width + 40 > maxWidth) maxWidth = text.width + 40;
          yOffset += item.type === 'h1' ? 40 : 30;
        } else if (item.category === 'description' || item.category === 'text') {
          const text = figma.createText();
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          text.characters = item.text || '[No text]';
          text.fontSize = 16;
          text.x = 20;
          text.y = yOffset;
          frame.appendChild(text);
          if (text.width + 40 > maxWidth) maxWidth = text.width + 40;
          yOffset += 20;
        } else if (item.category === 'image' && item.src) {
          const image = figma.createRectangle();
          const width = Math.min(item.width || 100, 760);
          const height = Math.min(item.height || 100, 760);
          image.resize(width, height);
          image.x = 20;
          image.y = yOffset;
          try {
            const imageData = await figma.createImageAsync(item.src);
            image.fills = [{ type: 'IMAGE', imageHash: imageData.hash, scaleMode: 'FIT' }];
          } catch (imgError) {
            image.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
          }
          frame.appendChild(image);
          if (width + 40 > maxWidth) maxWidth = width + 40;
          yOffset += height + 10;
        }
      } catch (error) {
        console.error('Error processing item:', error);
      }
    }

    frame.resize(maxWidth, yOffset + 20);
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.closePlugin("Prototype created successfully!");
  } else if (msg.type === 'error') {
    figma.notify(`Error: ${msg.message}`, { error: true });
    figma.closePlugin();
  }
};