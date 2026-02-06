import React from 'react'
import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';

const PlayerStats = ({ playerData }) => {  
  return (
    <div>
      <table border="1" className="border-collapse w-full text-center">
            <thead>
              <tr className="bg-gray-200">
                <th>Season</th>
                <th>Team</th>
                <th>GP</th>
                <th>PPG</th>
                <th>APG</th>
                <th>RPG</th>
              </tr>
            </thead>
            <tbody>
              {playerData.map((season, i) => {
                
                if(season.TEAM_ABBREVIATION === "TOT") return null; // skip total rows

                console.log("TEAM_ABBREVIATION:", season.TEAM_ABBREVIATION);
                return (
                <tr key={i} className="hover:bg-gray-100">
                  <td>{season.SEASON_ID}</td>
                  <td>
                    <Link
                        to={`/teams/${season.TEAM_ABBREVIATION}/${season.SEASON_ID}`}
                        className="text-blue-600 hover:underline"
                    >
                      {season.TEAM_ABBREVIATION}
                    </Link>
                  </td>
                  <td>{season.GP}</td>
                  <td>{(season.PTS / season.GP).toFixed(1)}</td>
                  <td>{(season.AST / season.GP).toFixed(1)}</td>
                  <td>{(season.REB / season.GP).toFixed(1)}</td>
                </tr>)
                })}
            </tbody>
          </table>
    </div>
  )
}

export default PlayerStats
