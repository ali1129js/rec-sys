/**
 * @Author: Ali
 * @Date:   2019-03-06T13:16:25+01:00
 * @Last modified by:   Ali
 * @Last modified time: 2019-06-20T17:26:44+02:00
 */

import React, { Component } from "react";
import { data } from "./Components/Data";
import Users from "./Components/Users";

import "./App.css";

class App extends Component {
  constructor() {
    super();
    this.state = {
      data
    };
  }
  handleChange = term => {
    this.setState({
      term: term.toLowerCase()
    });
  };
  handleClicked = e => {
    const { movies, users } = this.state.data;
    //grap the selected movie from the rendered list elements
    const movieName = e.target.innerHTML;
    //take the values only from the data.movies object
    const arr = Object.values(this.state.data.movies);
    this.setState({
      movieName
    });
    //We add 1 to the index because arrays start at 0 , and objects start at 1
    const myIndex = arr.indexOf(movieName) + 1;
    //Now we have the Movie we clicked on and its "real" index
    console.log(movieName, myIndex);
    /* !! this.state.data.users is an array of objects, each object has an array of numbers,we'll loop through that array and check if our selected movie exist, returns true/false
    for (let i = 0; i < users.length; i++) {
      const checkFun = users[i].movies.includes(myIndex);
    }
    */

    const allMoviesFromUsers = users.map((user, i) => {
      //check if that user has the selected movie index in his/her list of movies
      const checkFun = user.movies.includes(myIndex);
      if (checkFun) {
        const newIndex = user.movies.indexOf(myIndex);
        const userModArr = user.movies;
        userModArr.splice(newIndex, 1);
        return userModArr;
      } else {
        return [];
      }
    });
    console.log("allMoviesFromUsers", allMoviesFromUsers);
    const flattened = allMoviesFromUsers.reduce(
      (accumulator, currentValue) => accumulator.concat(currentValue),
      []
    );
    flattened.sort((a, b) => a > b);
    console.log("flattened", flattened);
    const counts = flattened.reduce((acc, curr) => {
      if (typeof acc[curr] == "undefined") {
        acc[curr] = 1;
      } else {
        acc[curr] += 1;
      }
      return acc;
    }, {});
    console.log(counts);
    let sortable = [];
    for (let movie in counts) {
      sortable.push([movie, counts[movie]]);
    }
    //bug here JavaScript stuff (var behaviour?)
    sortable.sort((a, b) => {
      return a[1] - b[1];
    });
    console.log("sortable :", sortable);
    const resultA = sortable.slice(sortable.length - 5);
    console.log(resultA);
    const recMoviekeys = resultA.map(movieRec => parseInt(movieRec[0]));
    console.log("recMoviekeys", recMoviekeys);

    const recommendation = recMoviekeys.map(ele => movies[ele]);
    this.setState({ recommendation });
  };
  render() {
    const { data, term, movieName, recommendation } = this.state;
    const arr = Object.values(data.movies);
    if (term === undefined && recommendation === undefined) {
      const movies = arr.map((movie, i) => (
        <li key={i} data-index={movie} onClick={this.handleClicked}>
          {movie}
        </li>
      ));
      return (
        <div className="App">
          <Users
            users={data.users}
            movies={data.movies}
            movieName={movieName}
            handleChange={this.handleChange}
          />

          <ul>{movies}</ul>
        </div>
      );
    } else {
      const filteredArr = arr.filter(letter =>
        letter.toLowerCase().match(term)
      );
      const movies = filteredArr.map((movie, i) => (
        <li data-index={movie} onClick={this.handleClicked} key={i}>
          {movie}
        </li>
      ));
      return (
        <div className="App">
          <Users
            users={data.users}
            movies={data.movies}
            movieName={movieName}
            handleChange={this.handleChange}
          />
          {this.state.recommendation.map((mov, i) => (
            <li key={i} style={recStyle}>
              {" "}
              {mov}{" "}
            </li>
          ))}
          <ul>{movies}</ul>
        </div>
      );
    }
  }
}
const recStyle = {
  display: "inline-block",
  border: "2px solid pink",
  backgroundColor: "#1abc9c",
  color: "#000000",
  margin: "15px",
  padding: "10px",
  width: "200px",
  height: "60px"
};
export default App;

// let resultArr = [];
// for (let i = 0; i < flattened.length; i++) {
//   let flag = true;
//   for (let j = 0; j < resultArr.length; j++) {
//     if (resultArr[j][0] === flattened[i]) {
//       resultArr[j][1] = resultArr[j][1] + 1;
//       flag = false;
//     }
//   }
//   if (flag) {
//     resultArr.push(flattened[i], 1);
//   }
// }
// console.log(resultArr);
//count dublicates
// let current = null;
// let cnt = 0;
// for (let i = 0; i < flattened.length; i++) {
//   if (flattened[i] !== current) {
//     if (cnt > 0) {
//       console.log(current + " comes --> " + cnt + " times<br>");
//     }
//     current = flattened[i];
//     cnt = 1;
//   } else {
//     cnt++;
//   }
//   if (cnt > 0) {
//     console.log(current + " comes --> " + cnt + " times");
//   }
// }
// const flattened  = this.state.data.users.reduce((acc, curVal,myIndex) => x.includes(myIndex) ? acc : [...acc, y], [])
