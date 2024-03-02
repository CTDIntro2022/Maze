// Revision:
//   Solution displayed
//	 Add drop down list for algorithms
//   Added class QueueFrontier and implemented breadth first search
//	 Greedy best fit search (Manhattan distance)
//	A* search(add cost of search)
//
// Things to do:
//  - Base class for all four descendants


// Where to post status text
const statusText = document.querySelector('.status');

// the two buttons for stepping and solving
const stepButton = document.getElementById("stepButton");
const solveButton = document.getElementById("solveButton");
const clearButton = document.getElementById("clearButton");
const grid = document.querySelector('.grid');
const fileButton = document.getElementById ("inputfile");
const UserOption  = document.getElementById('algo');

// Grid Colors
const COLOR_FRONTIER = 'lightblue'		// Node on frontier
const COLOR_EXPLORED = 'blue'			// Node that has been explored
const COLOR_UNEXPLORED = 'white'		// Unexplored Node
const COLOR_START = 'green'				// Starting Node
const COLOR_END = 'red'					// Finish, end node
const COLOR_WALL = 'lightgray'			// Wall nodes
const COLOR_SOLN = 'lightgreen'		// State in the solution

// Algorithms - These strings have to match strings in select element in HTML
const ALGO_DFS = "DFS"		// depth first search
const ALGO_BFS = "BFS"		// breadth first search
const ALGO_GBFS = "GBFS"
const ALGO_ASTAR = "AStar"			// A*

// True if maze initialized and ready for solving
let mazeInitialized = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Node Class
class Node {
	state			// Two element array, (row, column) of location in grid
	parent			// Node before action taken. Used to trace back solution
	action 			// One of : ["up", "down", "left", "right"]
	blockDistance	// Distance to the goal in city blocks, the Manhattan distance
	steps = 0		// Number of steps to get to this state, each state transition is a step
		
	constructor (state, parent, action, blockDistance) {
		console.log (`Create new node: \n\tState:${state}, \n\tParent: ${parent}, \n\tAction:${action}`);
		this.state = state
		this.parent = parent
		this.action = action
		this.blockDistance = blockDistance
		if (parent != null) {
			console.log ("  Parent not null")
			this.steps = parent.steps + 1
		}
		console.log (`  New Node: ${state} steps ${this.steps}`)
	}
	
	setColor (color) {
		let tagId = this.state[0] + "-" + this.state[1]
		const testCell = document.getElementById(tagId);
		// console.log ("Test Cell: ", testCell)
		// Start and Goal will not have a tag id 
		if (testCell) {
			testCell.style.setProperty('background-color', color, 'important')
		}
	}
	
	
}

class StackFrontier {
	constructor () {
		this.frontier = []
	}
	
	empty (){
		//console.log ("Frontier empty length: ", this.frontier.length)
		return (this.frontier.length === 0);
	}
	
	// add a node to the frontier
	add (node) {
		this.frontier.push(node);
		node.setColor(COLOR_FRONTIER);
	}
	
	// return to the last entered node, at top of array
	// remove that node from the array
	// If none then return undefined
	remove () {
		let topNode = this.frontier.pop()
		topNode.setColor (COLOR_EXPLORED)
		return topNode
	}
	
	// Return true if checkState is already in the frontier
	containState(checkState) {
		let isInFrontier = false;
		for (let i=0; i < this.frontier.length && !isInFrontier; i ++) {
			let frontierNode = this.frontier[i].state
			isInFrontier = ((frontierNode[0] === checkState[0]) && (frontierNode[1] === checkState[1]))

		}	
		return isInFrontier
	}

}

// Primary difference from stack frontier (which is a Stack - LIFO) is QueueFrontier is a Queue (FIFO)
// So the remove method is different
// Really should have one base class (frontier) with no remove function and then extend for 
// both Stack and Queue!

class QueueFrontier extends StackFrontier {
	
	// return the first entry in the frontier array
	// remove that node from the array
	// If none then return undefined
	remove () {
		let bottomNode = this.frontier.shift()
		bottomNode.setColor (COLOR_EXPLORED)
		console.log ("Queue remove: ", bottomNode, "\n\tLength: ", this.frontier.length);
		return bottomNode
	}
	
}

// Frontier class used in Greedy Best First where block (Manhattan) distance is considered
// That is implemented by sorting the frontier array by the block distance of each node
// The node with the shortest distance is on top so remove is a pop just as in stack frontier
class DistanceFrontier extends StackFrontier {

  // Compare the block distances of two nodes
  // Used in the sort array method
  // For descending put b first
  compareNodeDistance(a, b) {
    return b.blockDistance - a.blockDistance;
  }

  // add a node to the frontier. put into array sorted based on block distance
  // Push and sort
  add(node) {
    this.frontier.push(node);
    this.frontier.sort(this.compareNodeDistance);
	node.setColor(COLOR_FRONTIER);
  }
}

// Frontier class used in AStar where block (Manhattan) distance and steps to get to current state is considered
// That is implemented by sorting the frontier array by the block distance + steps f each node
// The node with the shortest distance is on top so remove is a pop just as in stack frontier
class AStarFrontier extends StackFrontier {

  // Compare the block distances of two nodes
  // Used in the sort array method
  // For descending put b first
  compareNodeDistanceAndSteps(a, b) {
    return ((b.blockDistance + b.steps) - (a.blockDistance + a.steps));
  }

  // add a node to the frontier. put into array sorted based on block distance
  // Push and sort
  add(node) {
    this.frontier.push(node);
    this.frontier.sort(this.compareNodeDistanceAndSteps);
	node.setColor(COLOR_FRONTIER);
  }
}


// Maze Class 
class Maze { 
	height = 0;		// number of rows
	width = 0;		// number of columns
	walls;			// Location of walls in the maze. 2D Array. Element is false if (i,j) is not a wall
	start; 		// Location of start
	goal;			// Location of goal
	numExplored = 0;
	explored;		// array of nodes explored
	newFrontier;
	solutionFound = false;

	// It must have A and B to start and finish
	// REturn empty string if OK else error string
	// SHould put A and B into array and loop through
	notValidMaze (mazeText) {
		let returnText = ""
		if (mazeText.indexOf("A") === -1) {
			returnText = "Missing start (A)";

		}
		if (mazeText.indexOf("B") === -1) {
			if (returnText) {
				returnText += " and finish (B)"
			}
			else {
				returnText = "Missing finish (B)"
			}
		}
		return (returnText);
	}
	
	statesExplored (){
		return this.numExplored
	}


	constructor (mazeText) {
		
		// Make sure valid
		let invalidMsg
		if (invalidMsg = this.notValidMaze (mazeText)) {
			console.log ("Not valid: ", mazeText);
			throw new Error(invalidMsg)
		}
		
		// Init the explored array
		this.explored = [];
		
		this.newFrontier = null;
			
		// The height is number of lines
		let rows = mazeText.split("\n");
		// if last row is empty then remove
		if (!rows[rows.length]) {
			console.log ("Last row is empty")
			rows.pop();		//Remove it from array
		}
		
		this.height= rows.length;
		console.log ("Height: ", this.height);
		
		// get max of row length. Probably can condense with find or filter?
		for (let i= 0; i < rows.length; i++) {
			if (this.width < rows[i].length) {
				this.width = rows[i].length
			}
		}
		console.log ("Width: ", this.width);
		
		// set the size of grid based on width and height
		// const grid = document.querySelector('.grid');	
		// grid is Global variable
		grid.style.gridTemplateColumns = `repeat(${this.width}, 1fr)`		
		grid.style.gridTemplateRows = `repeat(${this.height}, 1fr)`
		
		this.start = [];
		this.goal = [];
		this.walls = [];
		
		// Use a nested for loop to create the grid cells
		for (let i = 0; i < this.height; i++) {
			let row = [];		// Will append to walls
			for (let j = 0; j < this.width; j++) {
				const cell = document.createElement('div');
				let charStr = (rows[i].charAt(j))
				// Fill in cell depending on charStr
				// Eventually do switch

				// Create cell in the grid
				cell.classList.add('cell');
				grid.appendChild(cell);
				
				// cell.innerHTML = `(${i}, ${j})`
				
				// Record walls as true in walls array. Set colors of cells based on character. Not start and goal
				switch (charStr) {
					case "A" :
						cell.style.setProperty('background-color', COLOR_START, 'important');
						this.start [0] = i;
						this.start [1] = j;
						row.push (false);
						break;
	
					case "B":
						cell.style.setProperty('background-color', COLOR_END, 'important');
						this.goal [0] = i;
						this.goal [1] = j;
						row.push (false);
						break;
						
					case " ":
						row.push (false);
						cell.style.setProperty('background-color', COLOR_UNEXPLORED, 'important');
						let cellId = `${i}-${j}`
						cell.setAttribute('id', cellId)
						break;
						
					case "#":
						cell.style.setProperty('background-color', COLOR_WALL, 'important');
						row.push (true)
						break;
						
					default:
						console.log (`Unexpected "${charStr}"  at ${i}, ${j}`);
						row.push(true)
				}
			}
			this.walls.push (row);	// Add row to walls	
        }	// End of For Loop to create cells and record walls
    }
	  
	
	// Return the number of city blocks to the goal, the "manhattan distance"
	blocksToGoal (state) {
		console.log ("blocksToGoal state: ", state[0], ",", state[1]);
		let distanceToReturn = (Math.abs(state[0] - this.goal[1,0]) + Math.abs(state[1] - this.goal[0,1]))
		console.log ("  Distance: ", distanceToReturn)
		return distanceToReturn
	}
	
	// for a given state (i,j) return list of 
	neighbors (state) {
		let row = state[0];
		let col = state[1];
		  
		let candidates = [["up", [row-1, col]], ["down", [row + 1, col]], ["left", [row, col-1]], ["right", [row, col+1]]]
		let result = [];
		  
		for (let i=0; i< candidates.length; i++) {
			let cloc = candidates[i][1]
			let checkRow = cloc[0]
			let checkCol = cloc[1]
			let action = candidates[i][0]
			
			if((checkRow >= 0) && (checkRow <  this.height) && (checkCol >= 0) && (checkCol < this.width)){
				if (!this.walls[checkRow] [checkCol]) {
					result.push ([action, [checkRow,checkCol]] )
				}
			}
		}
		return result  
	} 
	
	// Initialization before solving starts
	// searchAlgo specifies the algorithm to use
	initSolve (searchAlgo){
		console.log ("initSolve()");
		this.numExplored = 0;	// None explored 
		
		// Create a node instance for start
		console.log ("BLocks for start: ", this.start);
		
		let startNode = new Node (this.start, null, null, this.blocksToGoal(this.start))
		console.log ("Start Node: ", startNode)
		
		// Set frontier based on algorithm selected
		switch (searchAlgo) {
			case ALGO_DFS:
				console.log ("Algo: ", searchAlgo)
				this.newFrontier = new StackFrontier()
				break;
			case ALGO_BFS:
				console.log ("Algo: ", searchAlgo)
				this.newFrontier = new QueueFrontier();
				break;
			case ALGO_GBFS:
				console.log ("Algo: ", searchAlgo)
				this.newFrontier = new DistanceFrontier();
				break;
			case ALGO_ASTAR:
				console.log ("Algo: ", searchAlgo)
				this.newFrontier = new AStarFrontier();
				break
			default:
				throw new Error (`Unexpected search algorithm: ${searchAlgo}`);
		}

		this.newFrontier.add(startNode)
		console.log ("Frontier: ", this.newFrontier);
	}
	
	// take next step in solving, pull node out of frontier
	nextSolve () {
		// if empty then no solution
		if (this.newFrontier.empty()) {
			throw new Error ("No solution found");
		}
		
		// choose a node from the frontier
		let nextNode = this.newFrontier.remove();
		console.log ("Next Solve, next Node state: ", nextNode.state)
		
		this.numExplored++;
		
		// check to see if at goal
		// console.log ("Check for goal: ", nextNode.state, this.goal)
		// console.log (nextNode.state[0,0], this.goal[0,0])
		if ((nextNode.state[0,0] === this.goal[0,0]) && 
			(nextNode.state[0,1] === this.goal[0,1]) &&
			(nextNode.state[1,0] === this.goal[1,0]) && 
			(nextNode.state[1,1] === this.goal[1,1]))  {
			this.finalState = nextNode;
			console.log ("Solved!!")
			return true
		}
		this.explored.push (nextNode.state);
		
		// Add neighbors to frontier
		let nextLook = this.neighbors (nextNode.state)
			
		for (let i=0; i < nextLook.length; i++) {
			// make a new node (State, parent, action)
			// console.log ("Action:", nextLook[i][0,0]);
			let tempState = nextLook[i][0,1]

			// add child if not already explored. This code checks the explored array for the state of child
			let alreadyExplored = this.explored.some(
					subarr => subarr.every(
						(arr_elem, ind) => arr_elem == tempState[ind]
						)	
					)
					
			if (!alreadyExplored) {
				// Also need to make sure not in frontier
				let alreadyInFrontier = this.newFrontier.containState(tempState);	
				if (!alreadyInFrontier) {
					console.log ("  adding node to frontier: ", tempState)
					let child = new Node (tempState, nextNode, nextLook[i][0,0], this.blocksToGoal(tempState));
					this.newFrontier.add (child)		// This should be property of the maze?
				}
			}
		}
		console.log ("  Frontier at end of nextSolve(): ", this.newFrontier);
	}
	getSolution () {
		let solnStates = 0;
		
		console.log ("Solution starting with: ", this.finalState);
		
		// beginning with finalState change color to indicate part of solution
		// Move to the partent until no more parents
		let solnNode = this.finalState.parent

		
		while (solnNode) {
			solnStates++
			solnNode.setColor(COLOR_SOLN)
			solnNode = solnNode.parent
		}
		return solnStates
		
	}
	
}


// Global variable
let myMaze = null;

// Call back function for step button on page
// On each click explore the next node in the frontier
function userStep (){
	console.log ("User Clicked");
	initializeMaze ();				// Will initialize maze if needed
	//try {
	console.log ("\n>>>Calling nextSolve()")
	if (myMaze.nextSolve()) {
			mazeSolved();
	}
	//}
	//catch (e) {
	//	solveError (e)
	//}
	
}

function userSolve() {
	console.log ("userSolve()")
	initializeMaze ();
	try {
		while (!myMaze.nextSolve()) {
		}
		mazeSolved();
	}
	catch (e) {
		solveError(e)
	}
	
}

function initializeMaze(){
	if (!mazeInitialized) {
		// disable algorithm selection, can't change once started
		UserOption.setAttribute("disabled", true);
		mazeInitialized = true
		myMaze.initSolve(UserOption.value);
	}
	
}


// Remove all child grid elements
function clearGrid () {
	const elements = document.querySelectorAll(".cell"); 
    elements.forEach(element => { 
        element.remove(); 
    }); 
	// disable since clear is done. Will be enabled once maze loaded.
	clearButton.setAttribute("disabled", true)
	stepButton.setAttribute("disabled", true)
	solveButton.setAttribute("disabled", true)
	fileButton.removeAttribute("disabled")			// Enable file choose
	UserOption.removeAttribute("disabled")			// Enable algorithm selection
	
	statusText.innerHTML = "Choose file with maze definition to load."
	
	// clear the file
	const fileField = document.getElementById('inputfile')
	fileField.value = ''
	
	// Maze is not initialized
	mazeInitialized = false
}

function solveError (e) {
	let solveErrorMsg = `${e.message} ${myMaze.statesExplored()} explored states`
	statusText.innerHTML = solveErrorMsg
	console.log (solveErrorMsg)
	// Disable buttons
	stepButton.setAttribute("disabled", true)
	solveButton.setAttribute("disabled", true)
}

function mazeSolved () {
	
	// Get number of states in solution and color code maze with solution states
	let solutionStates = myMaze.getSolution();
	
	let solveMsg = `Maze solve, ${myMaze.statesExplored()-2} explored states. ${solutionStates-1} states in the solution.`
	console.log (solveMsg)
	statusText.innerHTML = solveMsg	
	
	// Disable buttons
	stepButton.setAttribute("disabled", true)
	solveButton.setAttribute("disabled", true)
}

// Open file with grid definition
document.getElementById('inputfile')
            .addEventListener('change', function () {
                let fr = new FileReader();
				fr.onload = function () {
					try {
						myMaze = new Maze(fr.result);
					}
					catch (e) { 
						console.log ("Exception raised during Maze construction: ", e.message);
						statusText.innerHTML = e.message;
						return;
					}
					// testing distance
					let testState = [1,5]
					console.log (myMaze.blocksToGoal (testState));
					
					// Disable choose file until cleared
					fileButton.setAttribute("disabled", true);
					
					// Enable buttons and tell user what to do
					stepButton.removeAttribute("disabled")
					solveButton.removeAttribute("disabled")
					clearButton.removeAttribute("disabled")
					statusText.innerHTML = "Click on Step to explore frontier or Solve to solve the Maze."

                }
                fr.readAsText(this.files[0]);
            })







