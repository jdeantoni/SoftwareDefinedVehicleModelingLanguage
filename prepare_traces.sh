
for i in $( ls $1 ); do mv $1/$i $1/${i%.*}.trace; done
for file in $(ls $1); do
    echo $file
    sed -i "1s/.*/t,$2/" $1/$file
done
find $1 -type f | tr '\n' ' '
echo ""