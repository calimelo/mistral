const args = process.argv.slice(2);
global.CONTENT = args[0];
if (!global.CONTENT) {
  console.log('😡');
  return;
}

const url = 'http://localhost:1234/v1/chat/completions';

//check if the server is running
const http = require('http');
http
  .get(url, (res) => {
    const { statusCode } = res;
    if (statusCode !== 200) {
      global.OFFLINE = true;

      doAll();
    } else {
      global.OFFLINE = false;
      //   console.log('🌐');
      doAll();
    }
  })
  .on('error', (e) => {
    global.OFFLINE = true;
    // console.log('📴');
    doAll();
  });
const header = {
  'Content-Type': 'application/json',
};
const body = {
  messages: [
    {
      role: 'user',
      content: global.CONTENT,
    },
  ],
  temperature: 0.5,
  max_tokens: -1,
  stream: false,
};
function doAll() {
  console.clear();
  console.log('❓', global.CONTENT);
  if (global.OFFLINE) {
    console.log('📴');
  } else {
    console.log('🌐');
  }
  //check if the content was asked before
  const fs = require('fs');
  const dir = './results';
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      let content = file.split('.txt')[0];
      content = content.replace(/_/g, ' ');
      //remove all the special characters
      content = content.replace(/[^\w\s]/gi, '');
      if (content === global.CONTENT) {
        console.log('📖');
        const content = fs.readFileSync(dir + '/' + file, 'utf8');
        console.log(content);
        return;
      }
    }
  }
  //also check the codes folder
  const dir2 = './codes';
  if (fs.existsSync(dir2)) {
    const files = fs.readdirSync(dir2);
    for (const file of files) {
      let content = file.split('.py')[0];
      content = content.replace(/_/g, ' ');
      //remove all the special characters
      content = content.replace(/[^\w\s]/gi, '');
      if (content === global.CONTENT) {
        console.log('📖');
        //ask the user if they want to run the code
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question('💻? (y/n)', (answer) => {
          if (answer === 'y') {
            const { exec } = require('child_process');
            exec('python ' + dir2 + '/' + file, (err, stdout, stderr) => {
              if (err) {
                console.log(err);
                return;
              }
              console.log(stdout);
            });
          } else {
            console.log('👋');
          }
          readline.close();
        });
        return;
      }
    }
  }
  if (global.OFFLINE) {
    console.log('👋');
    return;
  }

  //if not, send request to the api
  console.log('🤖');
  //send request
  const request = require('request');
  request.post(
    {
      url: url,
      headers: header,
      body: JSON.stringify(body),
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        const result = JSON.parse(body);
        let a = result.choices[0].message;
        let b;
        a = JSON.parse(JSON.stringify(a));
        a = a.content;
        //if a includex ``` , it means it is a code block we need to get the content inside and merge if there are multiple code blocks
        //code starts with ```python\n and ends with ```
        //the code block content starts with python\n
        let codeBlockContent = [];
        if (a.includes('```')) {
          let codeBlock = a.split('```');
          for (let i = 0; i < codeBlock.length; i++) {
            if (codeBlock[i].includes('python\n')) {
              codeBlockContent.push(codeBlock[i].split('python\n')[1]);
            }
          }
          b = codeBlockContent.join('\n');
          //write to file
          const fs = require('fs');
          //filename should be the content but replace all the space with _
          let filename = global.CONTENT.replace(/ /g, '_');
          //remove all the special characters
          filename = filename.replace(/[^\w\s]/gi, '');
          //add .py extension
          filename = filename + '.py';
          //create a folder named codes if it does not exist
          const dir = './codes';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }
          //add the folder name to the filename
          filename = dir + '/' + filename;
          //write to file
          fs.writeFile(filename, b, function (err) {
            if (err) {
              return console.log(err);
            }
            console.log('💾');
            //ask the user if they want to run the code
            const readline = require('readline').createInterface({
              input: process.stdin,
              output: process.stdout,
            });
            readline.question('💻? (y/n)', (answer) => {
              if (answer === 'y') {
                const { exec } = require('child_process');
                exec('python ' + filename, (err, stdout, stderr) => {
                  if (err) {
                    console.log(err);
                    return;
                  }
                  console.log(stdout);
                });
              } else {
                console.log('👋');
              }
              readline.close();
            });
          });
        } else {
          // console.log(b);
          //write the question and answer to a file
          const fs = require('fs');
          //filename should be the content but replace all the space with _
          let filename = global.CONTENT.replace(/ /g, '_');
          //remove all the special characters
          filename = filename.replace(/[^\w\s]/gi, '');
          //add .txt extension
          filename = filename + '.txt';
          //create a folder named codes if it does not exist
          const dir = './results';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }
          //add the folder name to the filename
          filename = dir + '/' + filename;
          //add the question and answer to the file
          a = global.CONTENT + '\n' + a;
          //write to file
          fs.writeFile(filename, a, function (err) {
            if (err) {
              return console.log(err);
            }
            console.log('💾');
          });
        }

        //if there is no code block, we just need to remove the \n
      } else {
        console.log('error: ' + response.statusCode);
        console.log(body);
      }
    },
  );
}
