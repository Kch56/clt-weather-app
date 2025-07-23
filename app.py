from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

app = Flask(__name__)

NOAA_TOKEN = os.getenv("NOAA_TOKEN")
STATION_ID = "GHCND:USW00013881"

@app.route('/')
def home():
    return render_template('index.html', owm_key=os.getenv("OWM_KEY"))

@app.route('/monthly_weather', methods=['GET'])
def get_monthly_weather():
    year = request.args.get('year')
    month = request.args.get('month')
    start_date = f"{year}-{month}-01"
    end_date = (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=31)).replace(day=1) - timedelta(days=1)

    url = "https://www.ncdc.noaa.gov/cdo-web/api/v2/data"
    headers = {"token": NOAA_TOKEN}
    params = {
        "datasetid": "GHCND",
        "stationid": STATION_ID,
        "startdate": start_date,
        "enddate": end_date.strftime("%Y-%m-%d"),
        "limit": 1000,
        "units": "standard"
    }

    r = requests.get(url, headers=headers, params=params)
    if r.status_code == 200:
        return jsonify(r.json().get("results", []))
    else:
        return jsonify({"error": "Data fetch failed"}), 500

@app.route('/weather', methods=['GET'])
def get_single_day_weather():
    date = request.args.get('date')
    url = "https://www.ncdc.noaa.gov/cdo-web/api/v2/data"
    headers = {"token": NOAA_TOKEN}
    params = {
        "datasetid": "GHCND",
        "stationid": STATION_ID,
        "startdate": date,
        "enddate": date,
        "limit": 100,
        "units": "standard"
    }

    r = requests.get(url, headers=headers, params=params)
    if r.status_code == 200:
        return jsonify(r.json().get("results", []))
    else:
        return jsonify({"error": "Data fetch failed"}), 500

if __name__ == '__main__':
    app.run(debug=True)
