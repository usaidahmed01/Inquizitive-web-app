import requests

url = "http://127.0.0.1:8000/profiles/"
payload = {
    "data": {
        "user_id": "2cd92913-77be-4acd-a330-81edcbbfbd22",
        "full_name": "Sara Khan",
        "role": "student",
        "seat_no": "A102"
    }
}

resp = requests.post(url, json=payload)
print(resp.status_code, resp.json())