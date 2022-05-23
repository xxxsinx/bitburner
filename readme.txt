Starting and using the batcher
==============================

Requirements:
	1. Formulas.exe is needed
	2. Some calls to ns.getBitnodeMultipliers() are made in some files but are mostly not too important, you could edit them out (that function requires BN5.1)
	3. A batcher thrives on RAM. While it's possible to run a batcher with starter ram, it would be inefficient. As it is, the code only checks 5% leech and up and you'll needed
	   to have some minimal ram to run that even on n00dles. Access to the whole network (5 ports/nuke) is also a big help. If your ram is limited, I recomment using a sequential
	   hacker until you can fund some ram. starter.js and v1.js are both included in my repository and will cover that job.

Usage:

1. metrics.js is a script that's imported by most of the batcher-related utilities and can be ran standalone.
	usages:
		metrics <no params>			: Will calculate the batch metrics in 5% increments on all servers, chose the best for each and then output a list of targets from best to worse $/sec
		metrics <servername>		: Will calculate the batch metrics in 5% increments for the specified server and output a big comprehensive table on what's what. The best % will be shown in green.
		metrics <servername> <pct>	: Same as the previous usage, but limiting RAM to the specified 1-based percentage (1 for 100%). Default is 100%.
		
2. manager.js is my brute force optimistic batcher.
	notes:
		- It will automatically chose the best target percentage for the current ram constraints. This is re-evaluated each cycle.
		- You can limit it's ram usage to a percentage of total network ram (see usages)
		- It is a cycling batcher, meaning it will prep the server, start X batches, wait for them to completely end and then repeat.
		- There is zero provision/checks for desyncs until it loops back to prep.
		- Prep is skipped if no desync happened during the last cycle.
		- Desyncs caused by hack-level changes are reported in the tail window as a warning (yellow)
		- Desyncs of other origins will be reported to the terminal in red
		- You can manually run this, but it can also be automatically managed/called by controller.js (see later)

	usages:
		manager <servername> <1-based memory percentage> <loop=true> :	Starts batching the specified server using up to the specified memory percentage.
																		Loop is an optional parameter, if set to false, it will terminate after one cycle.										
		
3. controller.js
	notes:
		- This one is a work in progress and still has a manual configuration you should alter depending on your current hacking level and ram situation
		- It will prep and/or batch a certain number of servers simulteanously
		- The main goal here is to manage multiple batchers once ram allows, but also to avoid downtime caused by desyncs.
		- Suggested base usage is to configure it to prep 2 servers and batch 1. This will usually result in non-stop batching, against different targets.
		- This one uses metrics.js to automatically ramp up the targets as hacking level increases, delesting easier/less profitable targets
		
4. prep.js
	usage: prep <servername> : Preps the specified server (max cash, min security) and then terminates
	
	notes: You can manually call this situationally, but it's meant to be used by controller.js and manager.js to prepare servers.
	
5. JITbatcher.js
	usage: JITbatcher <servername> : Batches against the specified server
	
	notes:
		- This is a work in progress meant to replace manager.js
		- This is NOT a cyclic batcher
		- It keeps a list of all active batches and avoids all unsafe windows to avoid desyncs
		- Works with variable lenght batches (will just keep batching when a hack level increase happens and fit batches to avoid collisions)
		- Kills some hack jobs when a desync is detected to auto-correct the situation
		- Can fall back to prep if all hell breaks loose but I haven't seen that happen yet
		- My tests show it's performance in $/sec is about 25-40% of manager.js. Still debugging/figuring out why exactly that is.


Other utilies worthy of mention:

breach.js 			: My port opener/nuker script. It simply scans the network and nukes everything it can.
autostart.js 		: My singularity main file, it's a work in progress. For how it just sets sleeves on the most lucrative task and tries to buy TOR/port openers and will run breach on a loop. It also runs my gang manager.
installBackdoor.js	: Installs backdoors on the milestones servers only. Other servers are commented in there and you can remove the filter altogether if you want to nuke everything.
gangman.js			: Gang manager. Will not create the gang. Tweak constants up top to control focus, I have yet to automate this completely
factions.js			: WIP. Shows a curated list of augments mainly aimed at a hacking victory. Can buy augments for you with the 'buy' parameter.
bb.js				: WIP. BladeBurner management script. Very rudimentary, poorly optimized, tends to overdo raids and kill population/communities. Bad mojo.
casino.js			: WIP. Cheats the coin flip game without savescum. You need to input the bet manually once you stop losing.
stanek.js			: Charges stanek blocks (optional 1-based percent of max ram, defaults to 90%)
share.js			: Runs ns.share (optional 1-based percent of max ram, defaults to 90%)
xp.js				: Preps and then blasts joesguns with grow for XP (optional 1-based percent of max ram, defaults to 90%)
buyserver.js		: Personal server buying script/manager. See comments at top of file for usages
cct.js				: Finds and solves coding contracts. I have zero merit, I didn't write any of these. Does all but the 4 node color/compression contracts (TODO!)
corp.js				: WIP. This is very early tribulations of corp management. For now the only two actual functions are investor fraud (needs to be tweaked manualy) and office expansion/employee hiring/assignment
cs.js				: Connect to specified server. Uses singularity. Will chain connect to the specified partial server name.
find.js				: Find specified term in files. Can optionally search and replace (I WILL NOT BE HELD RESPONSIBLE FOR THE MESS THIS ONE CAN DO, SAVE YOUR FILES!)
graft.js			: WIP on grafting tribulations, currently lists the cheapest aug we can graft (to skip an install and just graft a few to get Daedelus 30/30 requirement)
hacknet.js			: Buys hacknet servers (NOT NODES, BN9 required). Parameter is a limit to how much we want to spend. It's broken and spends more than specified. Automatically selects the best hash/sec upgrade always.
hashes.js			: WIP/tribulations of automatically spending hashes (BN9)
ka.js				: Haven't used this one in months but kills all processes on all servers (except itself).
karma.js			: Shows current karma level
mults.js			: BN5 required. Shows current bitnode multipliers
myps.js				: Old script I made to replace ps and allow searching process names
myscan.js			: Lists all servers paths as connect strings you can copy/paste to run on terminal and get to a server. Optional servername for just that server.
ram.js				: Shows ram usage details and has a few ram-related functions
serverstonk.js		: Pulls some information from the source code repo to assiociate servers with stock symbols (deprecated, code has been merged/improved into xtree.js)
sleeves.js			: Used to assign tasks to sleeves, see code for details
starter.js/v1.js	: Lumping them because they are more or less the same. Sequential hacker. Use in low ram situations where batchers won't work.
stats.js			: Old/Deprecated, my initial attempt at using gym/universities and automating personal crimes, it's a big mess, prob shouldn't use it.
stonks.js			: Stock market manager. Supports both Pre-4S and 4S. Will automatically switch to 4S when it becomes available.
tables.js			: Library to display all those nice tables I have everywhere
travel.js			: int farming script (BN5)
tree.js				: Not my work, but outputs a layout you can upload to a website to see the network map
utils.js			: A collection of network exploration scripts. They all do the same thing. It is literally a collection.
xtree.js			: Shows the server network as a tree. Optional parameter sort to show hackable servers in max money order.