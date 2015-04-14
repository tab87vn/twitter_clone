# #
# # move to kafka dir
 cd /usr/local/kafka

# start zookeeper server
bin/zookeeper-server-start.sh config/zookeeper.properties

# start kafka server
bin/kafka-server-start.sh config/server.properties

#delete the topic tweets
#bin/kafka-topics.sh --zookeeper localhost:2181/chroot --delete --topic tweets
# create a 'tweets' topic
# make sure the topic 'tweets' has not been created
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic tweets

# compile
# now move to place where hw2 code is place
# assume it's placed at root directory
cd ~/hw2/spark-analytics/
#rm any existing output
rm -rf target/
mvn package
# run
/usr/local/spark/bin/spark-submit --class TwitterStreaming --master local[4] target/streaming-1.0.jar

# the output file is: top_10_hashtags.txt
#printf("See file top_10_hashtag.txt for result")

