let timerRef = {
	"J": {name: "Jacob", offset: 900, maxTimeBetweenEvent: 3600*6, duration: 20*60, mode: "Jacob"}
}
var timers={};
var loaded = false;
var dir = './config/ChatTriggers/modules/JacobsTimer/';
var scannedPage = [];
let jacobs = [];

import { Setting, SettingsObject } from "../SettingsManager/SettingsManager";


var SettingsArray = [
  {
    name: "Main",
    settings: [
      new Setting.Toggle("Enabled", true),
	  new Setting.Slider("Timer X", 5, 1, Renderer.screen.getWidth(), 1), //(name, value, min, max, round)
      new Setting.Slider("Timer Y", 5, 1, Renderer.screen.getHeight(), 1),

      new Setting.ColorPicker("Show Time", [0, 255, 0]),
      new Setting.ColorPicker("Hot Color Time", [255, 130, 0]),
      new Setting.ColorPicker("Active Time", [255, 0, 0]),
    ]
  },
];
for (var id in timerRef)
{
	SettingsArray.push(
	  {
		name: timerRef[id].name,
	  	settings: [
		  new Setting.Toggle("Enabled", true),
		  new Setting.TextInput("Name", timerRef[id].name),
		  new Setting.Slider("Show Time (seconds)", timerRef[id].maxTimeBetweenEvent,1, timerRef[id].maxTimeBetweenEvent, 1),
		  new Setting.Slider("Hot Color Time (seconds)", .1*timerRef[id].maxTimeBetweenEvent,1, timerRef[id].maxTimeBetweenEvent, 1)
		]
	  },
	  );
	 if (id === 'J')
		 SettingsArray[SettingsArray.length-1].settings.push(
		  new Setting.TextInput("Crops", "Cac,Car,Coc,Mel,Mush,Wart,Pot,Pump,Sugar,Wheat"),
		   );
}
const settings = new SettingsObject("JacobsTimer", SettingsArray)
  .setCommand("jacobstimer")
  .setSize(420, 200);
Setting.register(settings);

register("tick", () => {
    let inventory;
    try {
        inventory = Player.getOpenedInventory();
    } catch (e) {
        return;
    }

	if (scannedPage[inventory.getName()])
		return;
	//jacobs
	if (!scannedPage[inventory.getName()] && inventory.getName().match(/(?:Early )?(?:Summer|Winter|Spring|Autumn), Year \d+/)) {
		let month = [];
		for (let item of inventory.getItems()) {
			let lore;
			try {
				lore = item.getLore();
			} catch (error) {
				continue;
			}
			for (let i = 0; i < lore.length; ++i) {
				if (unformat(lore[i]).includes("Jacob's Farming Contest")) {
					let day = unformat(lore[0]).match(/Day \d*/) + " ";
					day = parseInt(day.split(' ')[1]);
					month.push({ day:day,  crops: lore.slice(i + 1, i + 4).map(i => unformat(i).slice(2)) });
					break;
				}
			}
		}
		if (month.length)
		{
			let year = parseInt(inventory.getName().match(/\d+/));
			let season = inventory.getName().match(/(?:Summer|Winter|Spring|Autumn)/);
			let term = inventory.getName().match(/(?:Early|Late)/);

			for (var i in month)
			{
				if (month[i])
				{
					var t = convertDayToUnix(year, season, term, month[i].day);
					if (t>(getUnix()-1199))
					{
						var foundMatch = false;
						for (var id in jacobs)
							if (jacobs[id].time === t)
								foundMatch = true;
						if (!foundMatch)
							jacobs.push({ time: t,  crops: month[i].crops });
					}
				}
			}
			scannedPage[inventory.getName()] = true;
			cleanJacobs();
			FileLib.write(
				dir + "jacobs.json",
				JSON.stringify(jacobs)
			);
			timers['J'].nextTime('J');
			ChatLib.chat('Jacobs Timer : ' + (term || 'Mid') + ' ' + season + ', Year ' + year + ' saved');
		}
	}
});

function convertDayToUnix(year, season, term, day)
{
	let unix = year * 3600*124 + 1559828102;
	if (season == "Spring")
		season = 0;
	else if (season == "Summer")
		season = 1;
	else if (season == "Autumn")
		season = 2;
	else if (season == "Winter")
		season = 3;
	unix = unix + (season * 3600*31);
	if (term == "Early")
		term = 0;
	else if (term == "Late")
		term = 2;
	else
		term = 1;
	unix = unix + term * 60*620;
	unix = unix + day * 60*20;
	return unix;
}



register('renderoverlay', (e) => {
	if (!settings.getSetting("Main", "Enabled"))
		return;
	if (!loaded)
	{
		loadJacobs();
		loadTimers();
		loaded = true;
	}
	for (var i in timers)
	{
		if (settings.getSetting(i, "Enabled"))
		{
			var t = timeTil(i);
			var color = false;
			var a = timers[i].active(i);
			if ((t < 0) && !a)
				timers[i].nextTime(i);
			if (a)
				color = settings.getSetting("Main", "Active Time");
			else if (t < gsi(i, "Hot Color Time (seconds)"))
				color = settings.getSetting("Main", "Hot Color Time");
			else if (t < gsi(i, "Show Time (seconds)"))
				color = settings.getSetting("Main", "Show Time");

			if (color)
			{
				new Text(timers[i].dispTimeText(t), gsi("Main", "Timer X"), gsi("Main", "Timer Y")+9*timers[i].pos)
					.setColor( Renderer.color(color[0], color[1], color[2], 255))
					.setShadow(true)
					.draw();
				new Text(settings.getSetting(i, "Name"), gsi("Main", "Timer X")+45, gsi("Main", "Timer Y")+9*timers[i].pos)
					.setColor( Renderer.color(color[0], color[1], color[2], 255))
					.setShadow(true)
					.draw();
				if (i === "J")
				new Text(timers[i].dispAfter, gsi("Main", "Timer X")+90, gsi("Main", "Timer Y")+9*timers[i].pos)
					.setColor( Renderer.color(color[0], color[1], color[2], 255))
					.setShadow(true)
					.draw();
				if (timers[i].mode === "CompletionTimer")
				new Text(timers[i].dispAfterB, gsi("Main", "Timer X")+120, gsi("Main", "Timer Y")+9*timers[i].pos)
					.setColor( Renderer.color(color[0], color[1], color[2], 255))
					.setShadow(true)
					.draw();
			}
		}
	}

})

function loadTimers()
{
	for (var i in timerRef)
	{
		timers[i]={	'id':i,	'pos':0,'mode':timerRef[i].mode,};
		timers[i].dispTimeText = function(t){return formatTime(t)};

		if (timerRef[i].mode === "time")
		{
			timers[i].nextUnix = getNextUnix(i,getUnix());
			timers[i].lastUnix = getNextUnix(i,getUnix())-timerRef[i].maxTimeBetweenEvent;
			timers[i].active=function(i)
				{
					if (timerRef[i].duration != 0)
					{
						//active if timeleft < duration
						if ((getUnix()-timers[i].lastUnix ) < timerRef[i].duration)
						{
							timers[i].nextUnix = timers[i].lastUnix+timerRef[i].duration;

							return true;
						}
					}
					return false;
				};
			timers[i].nextTime=function(i)
				{
					timers[i].lastUnix = getNextUnix(i,getUnix())-timerRef[i].maxTimeBetweenEvent;
					timers[i].nextUnix = getNextUnix(i,getUnix());
				};
		}
		else if (timerRef[i].mode === "Jacob")
		{
			var temp = getNextUnixJacob();
			timers[i].dispAfter = temp.lowestCrop; //display after 20:15 Jacob ______ matches nextUnix
			timers[i].lastUnix = temp.lowestTime; //last unix of start
			timers[i].nextUnix = temp.lowestTime; //this is timer change time (i.e changes to duration)

			timers[i].nextTime = function(i) //called only when timers[i].nextUnix<0
				{
					if (timers[i].active(i))
						return;
					cleanJacobs(); //removes expired times
					var temp = getNextUnixJacob(); //fetch the lowest unix
					timers[i].dispAfter = temp.lowestCrop; //display after 20:15 Jacob ______ matches nextUnix
					timers[i].lastUnix = temp.lowestTime; //last unix of start
					timers[i].nextUnix = temp.lowestTime; //this is timer change time (i.e changes to duration)
				};
			timers[i].active=function(i)
				{
					if (timers[i].lastUnix-getUnix()+timerRef[i].duration<0)
						return false;
					if ((timers[i].lastUnix-getUnix() ) < 0)
					{
						timers[i].nextUnix = timers[i].lastUnix+timerRef[i].duration;
						return true;
					}
					return false;
				};
		}
	}
}

function gsi(a,b)
{
	return parseInt(settings.getSetting(a, b));
}

function getUnix()
{
	return parseInt(Math.floor(Date.now() / 1000));
}

function getNextUnix(i, unix)
{
	return unix+timerRef[i].maxTimeBetweenEvent-(unix-timerRef[i].offset)%timerRef[i].maxTimeBetweenEvent;
}

function getNextUnixJacob() //returns the oldest time, sets crop to oldest match
{
	if (!jacobs)
		timers['J'].dispCrop = "Open Calendar";
	var SettingsCrops = settings.getSetting("J", "Crops").split(',');
	if (!SettingsCrops)
	{
		timers['J'].dispCrop = "No Crops in Settings";
		return getUnix()+30;
	}
	var lowestTime = getUnix()*2;
	var lowestCrop = "None";
	for (var id in jacobs)
	{

		for (var s in SettingsCrops) //go thru chosen crops
		{

			for (var c in jacobs[id].crops) //see if they match
			{

				if (jacobs[id].crops[c].includes(SettingsCrops[s]))
				{
					if (lowestTime>jacobs[id].time)
					{
						lowestTime = jacobs[id].time;
						lowestCrop = JSON.stringify(jacobs[id].crops).replace(/"/g, '').replace('[', '').replace(']', '').replace(/,/g, ', ');
					}
				}
			}
		}
	}
	return {'lowestCrop': lowestCrop, 'lowestTime': lowestTime};
}

function timeTil(i)
{
	return timers[i].nextUnix-getUnix();
}

function formatTime(time)
{
	time = parseInt(time);
	var r = "";
	var days = parseInt(time / 86400);
	if (days > 0)
	{
		r = r + days + "D";
		if (((time%86400) / 3600) > 0)
			r = r + ", " + parseInt((time%86400) / 3600) + "H";
		return r;
	}
	r = r + parseInt((time%86400) / 3600) + ":";
	var min = parseInt((time%3600) / 60);
	if (min < 10)
		r = r + "0";
	r = r + min + ":";
	var sec = parseInt(time%60);
	if (sec <10)
		r = r + "0";
	r = r + sec;
	return r;
}

function loadJacobs()
{
	jacobs = FileLib.read(dir + "jacobs.json");
	if (jacobs == "" || jacobs == null || jacobs == undefined)
		jacobs = [];
	else //check for expired
	{
		jacobs = JSON.parse(jacobs, function(key, value) {
            if (typeof value === "string" && value.startsWith("/Function(") && value.endsWith(")/")) {
                value = value.substring(10, value.length - 2);
                return eval("(" + value + ")");
            }
            return value;
        });
		cleanJacobs();
	}
	FileLib.write(
		dir + "jacobs.json",
		JSON.stringify(jacobs)
	);
}
function cleanJacobs()
{
		for (var id in jacobs)
		{
			if (jacobs[id].time < (getUnix()-1199)) //over 20 mins old
				jacobs.splice(id, 1);
		}

		jacobs.sort(function (a,b) {
					return a.time - b.time;
		});

}

function unformat(name) {
    return name.replace(/[§&]./gi, '').trim();
}

register('command', () => {
	let nextJacobs = getNextUnixJacob()
	let date2 = new Date(nextJacobs.lowestTime*1000)
	let dateFormated = date2.getUTCHours()+':'+date2.getUTCMinutes()+':'+date2.getUTCSeconds()+' UTC'

	ChatLib.chat('Next : ['+ dateFormated + '] ' + nextJacobs.lowestCrop);
}).setName('jtnext');
