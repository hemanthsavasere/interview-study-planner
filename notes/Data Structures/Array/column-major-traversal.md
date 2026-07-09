## Row-major vs column-major Traversal

### Row-major

Read left to right, row by row:

```java
for(int row = 0; row < matrix.length; row++){
    for(int col = 0; col < matrix[0].length; col++){
        result[index++] = matrix[row][col];
    }
}
```

### Column-major

Read top to bottom, column by column:

```java
for(int col = 0; col < matrix[0].length; col++){
    for(int row = 0; row < matrix.length; row++){
        result[index++] = matrix[row][col];
    }
}
```

The only difference is **which loop comes first**.

---

## Final mental template

```java
for each column:
    for each row:
        visit matrix[row][column]
```

In Java:

```java
for(int col = 0; col < matrix[0].length; col++){
    for(int row = 0; row < matrix.length; row++){
        result[index++] = matrix[row][col];
    }
}
```

## Memory hook

**Column-major = column first, then rows.**

Or even simpler:

> **“Pick a column, walk down the rows.”**

So remember:

```java
outer loop = column
inner loop = row
matrix[row][column]
```

That is the core pattern.
