// node firstproject --excel=worldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results
let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
let args = minimist(process.argv);
//download using axios
//read using jsdom
//make excel using excel4node
//mae pdf using pdf-lib

let responsekapromise = axios.get(args.source);
responsekapromise.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
  let matches = [];
  let matchscoredivs = document.querySelectorAll("div.match-score-block");
  for(let i = 0; i < matchscoredivs.length; i++){
      
      let match = {

      };
      let teamparas = matchscoredivs[i].querySelectorAll("p.name");
      match.t1 = teamparas[0].textContent;
      match.t2 = teamparas[1].textContent;
      let scorespans = matchscoredivs[i].querySelectorAll("span.score");
      if(scorespans.length == 2){
      match.t1s = scorespans[0].textContent;
      match.t2s = scorespans[1].textContent;
    }else if(scorespans.length == 1){
        match.t1s = scorespans[0].textContent;
        match.t2s = " ";
    }else{
        match.t1s = " ";
        match.t2s = " ";
    }
      let resultspan = matchscoredivs[i].querySelector("div.status-text > span");
      match.result = resultspan.textContent;
      matches.push(match);
      //console.log(i);
   }
   let matchesJSON = JSON.stringify(matches);
   fs.writeFileSync("matches.json", matchesJSON, "utf-8");
   let teams = [];
   for(let i = 0; i < matches.length; i++){
    putteaminteamsarrifmissing(teams, matches[i]);
   }
   for(let i = 0; i < matches.length; i++){
    putmatchinappropriateteam(teams, matches[i]);
   }
   let teamsJSON = JSON.stringify(teams);
   fs.writeFileSync("teams.json", teamsJSON, "utf-8");
   createExcelFile(teams);
   createFolders(teams);
})
function createFolders(teams){
    fs.mkdirSync(args.dataFolder);
    for(let i = 0; i < teams.length; i++){
        console.log(teams[i].name);
        let teamFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamFN);
        for(let j = 0; j < teams[i].matches.length; j++){
            let matchfilename = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name, teams[i].matches[j], matchfilename);
        }
    }
}
function createScoreCard(teamName, match, matchfilename) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfscore;
    let t2s = match.oppscore;
    let result = match.result;

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");
    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 320,
            y: 729,
            size: 8
        });
        page.drawText(t2, {
            x: 320,
            y: 715,
            size: 8
        });
        page.drawText(t1s, {
            x: 320,
            y: 701,
            size: 8
        });
        page.drawText(t2s, {
            x: 320,
            y: 687,
            size: 8
        });
        page.drawText(result, {
            x: 320,
            y: 673,
            size: 8
        });

        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
            fs.writeFileSync(matchfilename, finalPDFBytes);
        })
    })
}
function createExcelFile(teams){
    let wb = new excel.Workbook();
    for(let i = 0; i < teams.length; i++){
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1,1).string("vs");
        sheet.cell(1,2).string("selfscore");
        sheet.cell(1,3).string("oppscore");
        sheet.cell(1,4).string("result");
        for(let j = 0; j < teams[i].matches.length; j++){
            sheet.cell(2 + j,1).string(teams[i].matches[j].vs);
            sheet.cell(2 + j,2).string(teams[i].matches[j].selfscore);
            sheet.cell(2 + j,3).string(teams[i].matches[j].oppscore);
            sheet.cell(2 + j,4).string(teams[i].matches[j].result);
        }
    }
    wb.write(args.excel);
}
function putteaminteamsarrifmissing(teams, match){
    let t1idx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == match.t1){
            t1idx = i;
            break;
        }
    }
    if(t1idx == -1){
        teams.push({
            name: match.t1,
            matches: []
        });
    }
    let t2idx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == match.t2){
            t2idx = i;
            break;
        }
    }
    if(t2idx == -1){
        teams.push({
            name: match.t2,
            matches: []
        });
    }
}
function putmatchinappropriateteam(teams, match){
    let t1idx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == match.t1){
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfscore: match.t1s,
        oppscore: match.t2s,
        result: match.result
    });
    let t2idx = -1;
    for(let i = 0; i < teams.length; i++){
        if(teams[i].name == match.t2){
            t2idx = i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfscore: match.t2s,
        oppscore: match.t1s,
        result: match.result
    });

}