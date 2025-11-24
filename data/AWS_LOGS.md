## Create Query
this returns a queryID

aws logs start-query \
  --log-group-name "/aws/lambda/pocketpoker-backend" \
  --start-time $(date -v-10M +%s) \
  --end-time $(date +%s) \
  --query-string "fields @timestamp, @message | sort @timestamp desc | limit 50"



## Fetch logs from QueryID
aws logs get-query-results --query-id <queryID>